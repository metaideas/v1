import { execFileSync, spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import consola from "consola"

import { defineCommand } from "citty"
import type { PackageJson } from "./schemas.ts"
import { renameProject } from "./rename.ts"
import {
  fetchTemplate,
  getDependencyNames,
  getProjectScope,
  getScopePrefix,
  getWorkspacePath,
  readPackageJson,
  readTemplateStamp,
  TEMPLATE_REPO,
  TEMPLATE_SCOPE,
  type WorkspaceKind,
} from "./shared.ts"

type TemplateWorkspace = {
  kind: WorkspaceKind
  name: string
}

async function copyTemplateWorkspace(rootDir: string, ref: string, workspace: TemplateWorkspace) {
  const workspacePath = getWorkspacePath(workspace)
  const archive = spawnSync("git", ["archive", "--format=tar", ref, workspacePath], {
    cwd: rootDir,
    maxBuffer: Number.POSITIVE_INFINITY,
  })
  if (archive.status !== 0) {
    throw new Error(
      `${workspacePath} does not exist in ${TEMPLATE_REPO}@${ref.slice(0, 12)}: ${archive.stderr.toString().trim()}`
    )
  }

  execFileSync("tar", ["-x", "-C", rootDir], { input: archive.stdout })

  return readPackageJson(join(rootDir, workspacePath, "package.json"))
}

function getMissingTemplateDependencies(
  rootDir: string,
  packageJson: PackageJson,
  visited: Set<string>
) {
  const prefix = getScopePrefix(TEMPLATE_SCOPE)
  const candidates = getDependencyNames(packageJson)
    .filter((dependencyName) => dependencyName.startsWith(prefix))
    .map((dependencyName): TemplateWorkspace => ({
      kind: "package",
      name: dependencyName.slice(prefix.length),
    }))
    .filter((workspace) => {
      const workspacePath = getWorkspacePath(workspace)
      if (visited.has(workspacePath)) return false

      visited.add(workspacePath)
      return true
    })
  return candidates.filter(
    (workspace) => !existsSync(join(rootDir, getWorkspacePath(workspace), "package.json"))
  )
}

async function addWorkspaces(
  rootDir: string,
  ref: string,
  scope: string,
  queue: TemplateWorkspace[],
  visited: Set<string>
): Promise<string[]> {
  const [workspace, ...remaining] = queue
  if (!workspace) return []

  const workspacePath = getWorkspacePath(workspace)
  const packageJson = await copyTemplateWorkspace(rootDir, ref, workspace)
  const missing = getMissingTemplateDependencies(rootDir, packageJson, visited)

  await renameProject({
    rootDir: join(rootDir, workspacePath),
    scope,
    sourceScope: TEMPLATE_SCOPE,
  })

  if (missing.length > 0) {
    consola.info(
      `Copying missing workspace dependencies of ${workspacePath}: ${missing
        .map((dependency) => getWorkspacePath(dependency))
        .join(", ")}.`
    )
  }

  return [
    workspacePath,
    ...(await addWorkspaces(rootDir, ref, scope, [...remaining, ...missing], visited)),
  ]
}

export default defineCommand({
  args: {
    kind: {
      description: "Workspace type to add: app or package",
      required: true,
      type: "positional",
    },
    name: {
      description: "Name of the template workspace to copy",
      required: true,
      type: "positional",
    },
  },
  meta: {
    description: "Copy an app or package from the template at the recorded commit",
    name: "add",
  },
  run: async ({ args }) => {
    if (args.kind !== "app" && args.kind !== "package") {
      consola.error(`Unknown workspace type: ${args.kind}. Use app or package.`)
      process.exitCode = 1
      return
    }

    const rootDir = process.cwd()
    const scope = await getProjectScope(rootDir)
    const target: TemplateWorkspace = { kind: args.kind, name: args.name }
    const targetPath = getWorkspacePath(target)

    if (existsSync(join(rootDir, targetPath, "package.json"))) {
      consola.error(`The ${targetPath} workspace already exists in this project.`)
      process.exitCode = 1
      return
    }

    const stamp = await readTemplateStamp(rootDir)
    const head = await fetchTemplate(rootDir)
    const ref = stamp?.commit ?? head
    const copiedPaths = await addWorkspaces(rootDir, ref, scope, [target], new Set([targetPath]))
    consola.success(
      `Added ${copiedPaths.join(", ")} from ${TEMPLATE_REPO}@${ref.slice(0, 12)}. Run pnpm install, then pnpm template doctor.`
    )
    if (copiedPaths.includes("apps/mobile"))
      consola.warn(
        "Run `pnpm run --filter mobile prebuild` on macOS to rename the native iOS and Android projects."
      )
  },
})
