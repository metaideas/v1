import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import * as z from "zod"

export const TEMPLATE_SCOPE = "v1"
export const TEMPLATE_REPO = "metaideas/v1"
export const TEMPLATE_STAMP_FILE = ".template.json"

const ignoredDirectories = new Set([".cache", ".git", ".turbo", "build", "dist", "node_modules"])

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

const DependenciesSchema = z.record(z.string(), z.string()).optional()

const PackageJsonSchema = z.looseObject({
  dependencies: DependenciesSchema,
  devDependencies: DependenciesSchema,
  name: z.string().optional(),
  peerDependencies: DependenciesSchema,
})

export const TemplateCleanupSchema = z.object({
  cleanupPaths: z.array(z.string()),
  cleanupSections: z.array(z.string()),
})

const TemplateStampSchema = z.object({
  commit: z.string().optional(),
  createdAt: z.string(),
  template: z.string(),
})

export type PackageJson = z.infer<typeof PackageJsonSchema>
export type TemplateStamp = z.infer<typeof TemplateStampSchema>

export async function readPackageJson(path: string) {
  const value: unknown = await Bun.file(path).json()
  assertPackageJson(value)

  return value
}

// Narrowing the original value instead of returning the parsed copy keeps the key order of manifests that are written back.
function assertPackageJson(value: unknown): asserts value is PackageJson {
  PackageJsonSchema.parse(value)
}

export async function writeJson(path: string, value: unknown) {
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`)
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
  const workspaceFiles = new Bun.Glob("*/package.json")
  const workspaces: Workspace[] = []

  for await (const packageFile of workspaceFiles.scan({ cwd: workspaceRoot })) {
    const directory = dirname(packageFile)
    workspaces.push({
      directory: join(workspaceRoot, directory),
      name: basename(directory),
    })
  }

  return workspaces.toSorted((left, right) => left.name.localeCompare(right.name))
}

export async function getWorkspaceGraph(rootDir: string): Promise<WorkspaceNode[]> {
  const kinds: WorkspaceKind[] = ["app", "package"]
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

export async function readTemplateStamp(rootDir: string): Promise<TemplateStamp | undefined> {
  const path = join(rootDir, TEMPLATE_STAMP_FILE)
  if (!(await Bun.file(path).exists())) return

  return TemplateStampSchema.parse(await Bun.file(path).json())
}

export async function writeTemplateStamp(rootDir: string, stamp: TemplateStamp) {
  await writeJson(join(rootDir, TEMPLATE_STAMP_FILE), stamp)
}

export const TEMPLATE_REMOTE = "template"

export async function fetchTemplate(rootDir: string) {
  const remote = await Bun.$`git remote get-url ${TEMPLATE_REMOTE}`.cwd(rootDir).quiet().nothrow()
  if (remote.exitCode !== 0) {
    await Bun.$`git remote add ${TEMPLATE_REMOTE} https://github.com/${TEMPLATE_REPO}.git`
      .cwd(rootDir)
      .quiet()
  }
  await Bun.$`git fetch --quiet ${TEMPLATE_REMOTE} main`.cwd(rootDir).quiet()

  const head = await Bun.$`git rev-parse ${TEMPLATE_REMOTE}/main`.cwd(rootDir).text()
  return head.trim()
}

export async function getTextFiles(rootDir: string) {
  const files = new Bun.Glob("**/*")
  const paths: string[] = []

  for await (const relativePath of files.scan({
    cwd: rootDir,
    dot: true,
    onlyFiles: true,
  })) {
    if (relativePath.split("/").some((part) => ignoredDirectories.has(part))) continue

    paths.push(join(rootDir, relativePath))
  }

  const textFiles = await Promise.all(
    paths.map(async (path) => {
      const bytes = new Uint8Array(await Bun.file(path).arrayBuffer())
      return bytes.includes(0) ? undefined : path
    })
  )

  return textFiles.filter((path): path is string => path !== undefined)
}

export async function replaceTextInFiles(rootDir: string, search: string, replacement: string) {
  const textFiles = await getTextFiles(rootDir)
  const changedFiles = await Promise.all(
    textFiles.map(async (path) => {
      const contents = await Bun.file(path).text()
      if (!contents.includes(search)) return null

      await Bun.write(path, contents.replaceAll(search, replacement))
      return path
    })
  )

  return changedFiles.filter((path): path is string => path !== null)
}

export async function findTextReferences(rootDir: string, search: string) {
  const textFiles = await getTextFiles(rootDir)
  const matchingFiles = await Promise.all(
    textFiles.map(async (path) => {
      const contents = await Bun.file(path).text()
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

export function checkIsPathWithinRoot(rootDir: string, path: string) {
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
  await Bun.$`rm -rf ${resolvePathWithinRoot(rootDir, relativePath)}`.quiet()
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

export const TEMPLATE_SECTION_START = "<!-- TEMPLATE:START -->"
const TEMPLATE_SECTION_END = "<!-- TEMPLATE:END -->"

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

export async function runCommand(command: string[], rootDir: string) {
  const process = Bun.spawn(command, {
    cwd: rootDir,
    stderr: "inherit",
    stdout: "inherit",
  })
  const exitCode = await process.exited

  if (exitCode !== 0) {
    throw new Error(`Command failed: ${command.join(" ")}. Exited with code ${exitCode}.`)
  }
}
