import { join, relative } from "node:path"
import { defineCommand } from "citty"
import consola from "consola"

import { renameProject } from "./rename"
import { GitHubCommitSchema, type TemplateCleanup, TemplateCleanupSchema } from "./schemas"
import {
  getProjectScope,
  getWorkspaceGraph,
  getWorkspacePath,
  getWorkspaces,
  normalizeScope,
  readPackageJson,
  removePath,
  removeTemplateSections,
  resolvePathWithinRoot,
  runCommand,
  TEMPLATE_REPO,
  TEMPLATE_SCOPE,
  type Workspace,
  type WorkspaceKind,
  type WorkspaceNode,
  writeJson,
  writeTemplateStamp,
} from "./shared"

async function promptForWorkspaceNames(kind: WorkspaceKind, names: string[]) {
  const selected = await consola.prompt(`Select ${kind}s to keep`, {
    cancel: "reject",
    initial: names,
    options: names,
    type: "multiselect",
  })
  if (!Array.isArray(selected) || !selected.every((value) => value.constructor === String))
    throw new Error(`Expected the ${kind} selection to contain workspace names.`)

  return selected
}

async function promptForText(message: string, initial: string) {
  return await consola.prompt(message, { cancel: "reject", default: initial, type: "text" })
}

async function promptForConfirmation(message: string) {
  return await consola.prompt(message, { cancel: "reject", initial: true, type: "confirm" })
}

async function getTemplateCommit() {
  const response = await fetch(`https://api.github.com/repos/${TEMPLATE_REPO}/commits/main`)
  if (!response.ok) throw new Error(`GitHub returned ${response.status}.`)

  return GitHubCommitSchema.parse(await response.json()).sha
}

async function stampProject(rootDir: string) {
  const commit = await getTemplateCommit().catch((error: unknown): undefined => {
    consola.warn("Could not record the template commit.", error)
  })

  await writeTemplateStamp(rootDir, {
    commit,
    createdAt: new Date().toISOString(),
    template: TEMPLATE_REPO,
  })
}

function getSelectionError(kind: WorkspaceKind, selected: string[], available: string[]) {
  const unknown = selected.filter((name) => !available.includes(name))
  if (unknown.length > 0) {
    return `Unknown ${kind} workspace(s): ${unknown.join(", ")}. Available: ${available.join(", ") || "none"}.`
  }

  return null
}

function getWorkspaceKey(workspace: Pick<WorkspaceNode, "kind" | "name">) {
  return `${workspace.kind}/${workspace.name}`
}

function expandWorkspaceSelection(
  workspaces: WorkspaceNode[],
  selectedApps: string[],
  selectedPackages: string[]
) {
  const byPackageName = new Map(workspaces.map((workspace) => [workspace.packageName, workspace]))
  const selectedKeys = new Set([
    ...selectedApps.map((name) => `app/${name}`),
    ...selectedPackages.map((name) => `package/${name}`),
  ])
  const queue = workspaces.filter((workspace) => selectedKeys.has(getWorkspaceKey(workspace)))
  const autoKept: WorkspaceNode[] = []

  for (const workspace of queue) {
    for (const dependencyName of workspace.dependencies) {
      const dependency = byPackageName.get(dependencyName)
      if (!dependency || selectedKeys.has(getWorkspaceKey(dependency))) continue

      selectedKeys.add(getWorkspaceKey(dependency))
      queue.push(dependency)
      autoKept.push(dependency)
    }
  }

  const kept = workspaces.filter((workspace) => selectedKeys.has(getWorkspaceKey(workspace)))

  return {
    autoKept,
    keepApps: kept.filter((workspace) => workspace.kind === "app").map(({ name }) => name),
    keepPackages: kept.filter((workspace) => workspace.kind === "package").map(({ name }) => name),
  }
}

async function pruneWorkspaces(rootDir: string, workspaces: Workspace[], selectedNames: string[]) {
  await Promise.all(
    workspaces
      .filter((workspace) => !selectedNames.includes(workspace.name))
      .map((workspace) => removePath(rootDir, relative(rootDir, workspace.directory)))
  )
}

async function cleanupTemplateFiles(
  rootDir: string,
  { cleanupPaths, cleanupSections }: TemplateCleanup
) {
  const packageJsonPath = join(rootDir, "package.json")
  const packageJson = await readPackageJson(packageJsonPath)

  await Promise.all(cleanupPaths.map((path) => removePath(rootDir, path)))
  await Promise.all(
    cleanupSections.map(async (relativePath) => {
      const path = resolvePathWithinRoot(rootDir, relativePath)
      await Bun.write(path, removeTemplateSections(await Bun.file(path).text()))
    })
  )

  delete packageJson["bun-create"]
  delete packageJson.v1
  await writeJson(packageJsonPath, packageJson)
}

export default defineCommand({
  args: {
    git: {
      description: "Initialize a git repository",
      negativeDescription: "Skip git repository initialization",
      type: "boolean",
    },
    install: {
      description: "Run bun install",
      negativeDescription: "Skip bun install",
      type: "boolean",
    },
    "keep-apps": {
      description: "Apps to keep (comma-separated)",
      type: "string",
    },
    "keep-packages": {
      description: "Packages to keep (comma-separated)",
      type: "string",
    },
    name: {
      description: "Project name for the root package",
      type: "string",
    },
    yes: {
      description: "Accept defaults for any option not provided and skip prompts",
      type: "boolean",
    },
  },
  meta: {
    description: "Select workspaces, rename the project, and remove template files",
    name: "setup",
  },
  run: async ({ args, rawArgs }) => {
    const rootDir = process.cwd()
    const shouldAcceptDefaults = args.yes ?? false
    const hasEmptyKeepAppsOption = rawArgs.some(
      (argument, index) =>
        (argument === "--keep-apps" || argument === "--keepApps")
        && rawArgs[index + 1]?.startsWith("-") !== false
    )
    const hasEmptyKeepPackagesOption = rawArgs.some(
      (argument, index) =>
        (argument === "--keep-packages" || argument === "--keepPackages")
        && rawArgs[index + 1]?.startsWith("-") !== false
    )

    if (hasEmptyKeepAppsOption) {
      consola.error("Provide at least one workspace name with --keep-apps.")
      process.exitCode = 1
      return
    }
    if (hasEmptyKeepPackagesOption) {
      consola.error("Provide at least one workspace name with --keep-packages.")
      process.exitCode = 1
      return
    }

    const apps = await getWorkspaces(rootDir, "app")
    const packages = await getWorkspaces(rootDir, "package")
    const rootPackage = await readPackageJson(join(rootDir, "package.json"))
    const defaultName = rootPackage.name ?? "project"
    const cleanup = TemplateCleanupSchema.safeParse(
      rootPackage.v1 ?? { cleanupPaths: [], cleanupSections: [] }
    )
    if (!cleanup.success) {
      consola.error(
        "The v1 field in package.json needs cleanupPaths and cleanupSections arrays. Fix it before setup changes the project."
      )
      process.exitCode = 1
      return
    }
    const sourceScope = await getProjectScope(rootDir).catch(() => TEMPLATE_SCOPE)
    const selectedApps = args["keep-apps"]?.split(",").filter(Boolean)
    const selectedPackages = args["keep-packages"]?.split(",").filter(Boolean)

    if (args["keep-apps"] !== undefined && selectedApps?.length === 0) {
      consola.error("Provide at least one workspace name with --keep-apps.")
      process.exitCode = 1
      return
    }
    if (args["keep-packages"] !== undefined && selectedPackages?.length === 0) {
      consola.error("Provide at least one workspace name with --keep-packages.")
      process.exitCode = 1
      return
    }

    const keepApps =
      selectedApps
      ?? (shouldAcceptDefaults
        ? apps.map((workspace) => workspace.name)
        : await promptForWorkspaceNames(
            "app",
            apps.map((workspace) => workspace.name)
          ))
    const keepPackages =
      selectedPackages
      ?? (shouldAcceptDefaults
        ? packages.map((workspace) => workspace.name)
        : await promptForWorkspaceNames(
            "package",
            packages.map((workspace) => workspace.name)
          ))
    const projectName =
      args.name
      ?? (shouldAcceptDefaults ? defaultName : await promptForText("Project name", defaultName))
    const shouldInitializeGit =
      args.git
      ?? (shouldAcceptDefaults ? true : await promptForConfirmation("Initialize a git repository?"))
    const shouldInstall =
      args.install
      ?? (shouldAcceptDefaults ? true : await promptForConfirmation("Run bun install?"))

    const selectionError =
      getSelectionError(
        "app",
        keepApps,
        apps.map((workspace) => workspace.name)
      )
      ?? getSelectionError(
        "package",
        keepPackages,
        packages.map((workspace) => workspace.name)
      )
    if (selectionError) {
      consola.error(selectionError)
      process.exitCode = 1
      return
    }
    try {
      normalizeScope(projectName)
    } catch (error) {
      consola.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
      return
    }

    const selection = expandWorkspaceSelection(
      await getWorkspaceGraph(rootDir),
      keepApps,
      keepPackages
    )
    if (selection.autoKept.length > 0) {
      consola.info(
        `Keeping workspace dependencies: ${selection.autoKept.map(getWorkspacePath).join(", ")}.`
      )
    }

    await pruneWorkspaces(rootDir, apps, selection.keepApps)
    await pruneWorkspaces(rootDir, packages, selection.keepPackages)
    await renameProject({ projectName, rootDir, scope: projectName, sourceScope })
    await stampProject(rootDir)
    await cleanupTemplateFiles(rootDir, cleanup.data)

    if (shouldInitializeGit && !(await Bun.file(join(rootDir, ".git")).exists()))
      await runCommand(["git", "init"], rootDir)
    if (shouldInstall) {
      await runCommand(["bun", "install"], rootDir)
      await runCommand(["bun", "run", "codegen"], rootDir)
    }

    consola.success("Template setup complete. Run `bun template doctor` to verify the project.")
  },
})
