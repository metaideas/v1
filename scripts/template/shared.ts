import { execFile, spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { glob, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { promisify } from "node:util"
import { parseJSON, stringifyJSON } from "confbox"
import {
  type KnipConfig,
  type PackageJson,
  PackageJsonSchema,
  type TemplateStamp,
  TemplateStampSchema,
} from "./schemas.ts"

export type WorkspaceKind = "app" | "package"

export type Workspace = {
  directory: string
  name: string
}

export type WorkspaceNode = Workspace & {
  dependencies: string[]
  kind: WorkspaceKind
  packageName: string
}

export const TEMPLATE_SCOPE = "v1"
export const TEMPLATE_REPO = "metaideas/v1"
export const TEMPLATE_STAMP_FILE = ".template.json"

const TEMPLATE_REMOTE = "template"
export const TEMPLATE_SECTION_START = "<!-- TEMPLATE:START -->"
const TEMPLATE_SECTION_END = "<!-- TEMPLATE:END -->"

export const execFileAsync = promisify(execFile)

const ignoredDirectories = new Set([".cache", ".git", ".turbo", "build", "dist", "node_modules"])

// Narrowing the original value instead of returning the parsed copy keeps the key order of manifests that are written back.
function assertPackageJson(value: unknown): asserts value is PackageJson {
  PackageJsonSchema.parse(value)
}

export async function readPackageJson(path: string) {
  const value = parseJSON(await readFile(path, "utf8"))
  assertPackageJson(value)

  return value
}

export async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${stringifyJSON(value).trimEnd()}\n`)
}

export function normalizeScope(scope: string) {
  const normalizedScope = scope.replace(/^@/, "").trim()

  if (!/^[a-z0-9][a-z0-9-]*$/i.test(normalizedScope)) {
    throw new Error(
      `The npm scope must contain only letters, numbers, and dashes. Received: ${JSON.stringify(scope)}.`
    )
  }

  return normalizedScope
}

export function getScopePrefix(scope: string) {
  return `@${scope}/`
}

export function getDependencyNames(packageJson: PackageJson) {
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
  ].flatMap((dependencies) => Object.keys(dependencies ?? {}))
}

export async function getWorkspaces(rootDir: string, kind: WorkspaceKind) {
  const workspaceRoot = join(rootDir, `${kind}s`)
  const workspaces: Workspace[] = []

  for await (const packageFile of glob("*/package.json", { cwd: workspaceRoot })) {
    const directory = dirname(packageFile)
    workspaces.push({
      directory: join(workspaceRoot, directory),
      name: basename(directory),
    })
  }

  return workspaces.toSorted((left, right) => left.name.localeCompare(right.name))
}

export async function getWorkspaceGraph(rootDir: string) {
  const kinds = ["app", "package"] as const
  const nodes = await Promise.all(
    kinds.map(async (kind) => {
      const workspaces = await getWorkspaces(rootDir, kind)

      return Promise.all(
        workspaces.map(async ({ directory, name }): Promise<WorkspaceNode> => {
          const packageJson = await readPackageJson(join(directory, "package.json"))

          return {
            dependencies: getDependencyNames(packageJson),
            directory,
            kind,
            name,
            packageName: packageJson.name ?? "",
          }
        })
      )
    })
  )

  return nodes.flat()
}

export function getWorkspacePath(workspace: Pick<WorkspaceNode, "kind" | "name">) {
  return `${workspace.kind}s/${workspace.name}`
}

export async function readTemplateStamp(rootDir: string) {
  const path = join(rootDir, TEMPLATE_STAMP_FILE)
  if (!existsSync(path)) return

  return TemplateStampSchema.parse(JSON.parse(await readFile(path, "utf8")))
}

export async function writeTemplateStamp(rootDir: string, stamp: TemplateStamp) {
  await writeJson(join(rootDir, TEMPLATE_STAMP_FILE), stamp)
}

export async function fetchTemplate(rootDir: string) {
  const options = { cwd: rootDir }
  const hasRemote = await execFileAsync(
    "git",
    ["remote", "get-url", TEMPLATE_REMOTE],
    options
  ).then(
    () => true,
    () => false
  )
  if (!hasRemote) {
    await execFileAsync(
      "git",
      ["remote", "add", TEMPLATE_REMOTE, `https://github.com/${TEMPLATE_REPO}.git`],
      options
    )
  }
  await execFileAsync("git", ["fetch", "--quiet", TEMPLATE_REMOTE, "main"], options)

  const { stdout: head } = await execFileAsync(
    "git",
    ["rev-parse", `${TEMPLATE_REMOTE}/main`],
    options
  )
  return head.trim()
}

// Lists files without following symlinks, so a linked file is not rewritten twice.
async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (ignoredDirectories.has(entry.name)) return []
      if (entry.isDirectory()) return listFiles(path)
      return entry.isFile() ? [path] : []
    })
  )

  return files.flat()
}

async function getTextFiles(rootDir: string) {
  const paths = await listFiles(rootDir)
  const textFiles = await Promise.all(
    paths.map(async (path) => {
      const bytes = await readFile(path)
      return bytes.includes(0) ? undefined : path
    })
  )

  return textFiles.filter((path): path is string => path !== undefined)
}

export async function replaceTextInFiles(rootDir: string, search: string, replacement: string) {
  const textFiles = await getTextFiles(rootDir)
  const changedFiles = await Promise.all(
    textFiles.map(async (path) => {
      const contents = await readFile(path, "utf8")
      if (!contents.includes(search)) return null

      await writeFile(path, contents.replaceAll(search, replacement))
      return path
    })
  )

  return changedFiles.filter((path): path is string => path !== null)
}

export async function findTextReferences(rootDir: string, search: string) {
  const textFiles = await getTextFiles(rootDir)
  const matchingFiles = await Promise.all(
    textFiles.map(async (path) => {
      const contents = await readFile(path, "utf8")
      return contents.includes(search) ? path : null
    })
  )

  return matchingFiles.filter((path): path is string => path !== null)
}

export async function getProjectScope(rootDir: string) {
  const workspaces = await Promise.all([
    getWorkspaces(rootDir, "app"),
    getWorkspaces(rootDir, "package"),
  ])

  const packageNames = await Promise.all(
    workspaces.flat().map(async (workspace) => {
      const packageJson = await readPackageJson(join(workspace.directory, "package.json"))
      return packageJson.name
    })
  )
  const packageName = packageNames.find((name) => name !== undefined && /^@[^/]+\//.test(name))
  const match = packageName && /^@([^/]+)\//.exec(packageName)
  const scope = match?.[1]
  if (scope) return normalizeScope(scope)

  throw new Error("Could not determine the project npm scope from its workspaces.")
}

function checkIsPathWithinRoot(rootDir: string, path: string) {
  const pathFromRoot = relative(rootDir, path)

  return (
    pathFromRoot !== ""
    && pathFromRoot !== ".."
    && !pathFromRoot.startsWith(`..${sep}`)
    && !isAbsolute(pathFromRoot)
  )
}

export function resolvePathWithinRoot(rootDir: string, relativePath: string) {
  const resolvedRootDir = resolve(rootDir)
  const path = resolve(resolvedRootDir, relativePath)

  if (!checkIsPathWithinRoot(resolvedRootDir, path)) {
    throw new Error(`Cleanup path must be within the project: ${relativePath}.`)
  }

  return path
}

export async function removePath(rootDir: string, relativePath: string) {
  await rm(resolvePathWithinRoot(rootDir, relativePath), { force: true, recursive: true })
}

export function checkIsRemovedByCleanup(
  rootDir: string,
  relativePath: string,
  cleanupPaths: readonly string[]
) {
  const path = resolve(rootDir, relativePath)

  return cleanupPaths.some((cleanupPath) => {
    const cleanupTarget = resolve(rootDir, cleanupPath)
    return path === cleanupTarget || checkIsPathWithinRoot(cleanupTarget, path)
  })
}

/**
 * Lists the application and package workspaces that a knip config configures by path but the
 * project does not have. Globs such as `apps/*` always resolve.
 */
export function findUnknownKnipWorkspaces(config: KnipConfig, workspacePaths: ReadonlySet<string>) {
  return Object.keys(config.workspaces ?? {}).filter(
    (path) => /^(?:apps|packages)\/[^*]+$/.test(path) && !workspacePaths.has(path)
  )
}

function joinAroundRemovedSection(before: string, after: string) {
  const trailingNewlines = /\n*$/.exec(before)?.[0] ?? ""
  const leadingNewlines = /^\n*/.exec(after)?.[0] ?? ""
  const isAtStart = before.length === trailingNewlines.length
  const isAtEnd = after.length === leadingNewlines.length

  if (isAtStart) return after.slice(leadingNewlines.length)
  if (isAtEnd) return `${before.slice(0, before.length - trailingNewlines.length)}\n`
  if (trailingNewlines.length === 0 || leadingNewlines.length === 0) return before + after

  return `${before.slice(0, before.length - trailingNewlines.length)}\n\n${after.slice(leadingNewlines.length)}`
}

export function removeTemplateSections(contents: string) {
  let remaining = contents

  while (remaining.includes(TEMPLATE_SECTION_START)) {
    const start = remaining.indexOf(TEMPLATE_SECTION_START)
    const end = remaining.indexOf(TEMPLATE_SECTION_END, start)
    if (end === -1) {
      throw new Error(`Expected ${TEMPLATE_SECTION_END} after each ${TEMPLATE_SECTION_START}.`)
    }

    remaining = joinAroundRemovedSection(
      remaining.slice(0, start),
      remaining.slice(end + TEMPLATE_SECTION_END.length)
    )
  }

  return remaining
}

export async function runCommand(
  [command, ...args]: readonly [string, ...string[]],
  rootDir: string
) {
  const child = spawn(command, args, { cwd: rootDir, stdio: "inherit" })
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject).once("close", resolve)
  })

  if (exitCode !== 0) {
    throw new Error(
      `Command failed: ${[command, ...args].join(" ")}. Exited with code ${exitCode}.`
    )
  }
}
