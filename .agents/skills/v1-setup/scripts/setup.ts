import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { glob, readFile, rm, writeFile } from "node:fs/promises"
import { basename, join, relative } from "node:path"
import { defineCommand, runMain } from "citty"
import consola from "consola"
import * as z from "zod"

import { renameProject } from "../../v1-update/scripts/rename.ts"
import {
  getProjectScope,
  getScopePrefix,
  getTextFiles,
  getDependencyNames,
  getWorkspacePath,
  getWorkspaces,
  normalizeScope,
  readPackageJson,
  readTemplateStamp,
  TEMPLATE_REPO,
  TEMPLATE_SCOPE,
  type Workspace,
  type WorkspaceKind,
  type WorkspaceNode,
  writeJson,
  writeTemplateStamp,
} from "../../v1-update/scripts/template.ts"
import {
  checkIsTemplateReadme,
  removePath,
  removeTemplateSections,
  resolvePathWithinRoot,
  TEMPLATE_SECTION_START,
  type TemplateCleanup,
  TemplateCleanupSchema,
} from "./cleanup.ts"

const GitHubCommitSchema = z.object({ sha: z.string() })

// Setup deletes its own skill only after every step succeeds, so a failed run can be retried.
const SETUP_SKILL_DIR = join(import.meta.dirname, "..")

// These helpers serve only setup, which deletes itself, so they live here instead of in the
// v1-update helpers that a project keeps.
async function getWorkspaceGraph(rootDir: string) {
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

async function findTextReferences(rootDir: string, search: string) {
  const textFiles = await getTextFiles(rootDir)
  const matchingFiles = await Promise.all(
    textFiles.map(async (path) => {
      const contents = await readFile(path, "utf8")
      return contents.includes(search) ? path : null
    })
  )

  return matchingFiles.filter((path): path is string => path !== null)
}

async function runCommand([command, ...args]: readonly [string, ...string[]], rootDir: string) {
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

// `pnpm create @metaideas/v1` writes the stamp with the commit it downloaded, and a second run of
// setup finds the stamp that the first run wrote. Only a project without a stamp, such as one
// created with `gh repo create --template`, records the head of main.
async function stampProject(rootDir: string) {
  if (await readTemplateStamp(rootDir)) return

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

  // A cleanup path can be a workspace, such as scripts/create, so its pnpm-workspace.yaml entry
  // goes with it. The file keeps its comments because only matching list items are dropped.
  const workspaceFilePath = join(rootDir, "pnpm-workspace.yaml")
  const workspaceFile = await readFile(workspaceFilePath, "utf8")
  await writeFile(
    workspaceFilePath,
    workspaceFile
      .split("\n")
      .filter((line) => !cleanupPaths.some((path) => line.trim() === `- ${path}`))
      .join("\n")
  )

  await Promise.all(
    cleanupSections.map(async (relativePath) => {
      const path = resolvePathWithinRoot(rootDir, relativePath)
      await writeFile(path, removeTemplateSections(await readFile(path, "utf8")))
    })
  )

  delete packageJson.v1
  await writeJson(packageJsonPath, packageJson)
}

async function getWorkspaceLines(rootDir: string) {
  const workspaces = await getWorkspaceGraph(rootDir)

  return Promise.all(
    workspaces.map(async (workspace) => {
      const path = getWorkspacePath(workspace)
      const { description } = await readPackageJson(join(workspace.directory, "package.json"))

      return description
        ? `- [\`${path}\`](./${path}): ${description}`
        : `- [\`${path}\`](./${path})`
    })
  )
}

async function getDocumentationLines(rootDir: string) {
  const paths = await Array.fromAsync(glob("docs/*.md", { cwd: rootDir }))
  const documents = await Promise.all(
    paths.map(async (path) => {
      const title = /^title:\s*(.+)$/m.exec(await readFile(join(rootDir, path), "utf8"))?.[1]
      return { path, title: title ?? basename(path, ".md") }
    })
  )

  return documents
    .toSorted(
      (left, right) =>
        Number(right.path === "docs/getting-started.md")
          - Number(left.path === "docs/getting-started.md") || left.title.localeCompare(right.title)
    )
    .map(({ path, title }) => `- [${title}](./${path})`)
}

// The template README describes v1 itself, so setup replaces it with one that describes the project.
async function writeReadme(rootDir: string, projectName: string, description: string) {
  const workspaceLines = await getWorkspaceLines(rootDir)
  const documentationLines = await getDocumentationLines(rootDir)
  const sections = [
    `# ${projectName}`,
    description,
    "## Workspaces",
    workspaceLines.join("\n"),
    ...(documentationLines.length > 0 ? ["## Documentation", documentationLines.join("\n")] : []),
  ].filter(Boolean)

  await writeFile(join(rootDir, "README.md"), `${sections.join("\n\n")}\n`)
}

// Setup leaves no template scope, cleanup marker, or template README behind. Running it reports what
// a partial run left, so a second run can finish the job.
function checkIsOutsideSetup(path: string) {
  return relative(SETUP_SKILL_DIR, path).startsWith("..")
}

async function findLeftovers(rootDir: string, scope: string) {
  const scopeReferences =
    normalizeScope(scope) === TEMPLATE_SCOPE
      ? []
      : await findTextReferences(rootDir, getScopePrefix(TEMPLATE_SCOPE))
  const markers = await findTextReferences(rootDir, TEMPLATE_SECTION_START)
  const readme = join(rootDir, "README.md")
  const packageJson = await readPackageJson(join(rootDir, "package.json"))

  return [
    ...scopeReferences
      .filter((path) => checkIsOutsideSetup(path))
      .map(
        (path) => `${relative(rootDir, path)} still references ${getScopePrefix(TEMPLATE_SCOPE)}`
      ),
    ...markers
      .filter((path) => checkIsOutsideSetup(path))
      .map((path) => `${relative(rootDir, path)} still has a ${TEMPLATE_SECTION_START} marker`),
    ...(existsSync(readme) && checkIsTemplateReadme(await readFile(readme, "utf8"))
      ? ["README.md is still the template README"]
      : []),
    ...("v1" in packageJson ? ["package.json still has the v1 field"] : []),
  ]
}

await runMain(
  defineCommand({
    args: {
      description: {
        description: "One-sentence description of the project for the README",
        type: "string",
      },
      git: {
        description: "Initialize a git repository",
        negativeDescription: "Skip git repository initialization",
        type: "boolean",
      },
      install: {
        description: "Run pnpm install",
        negativeDescription: "Skip pnpm install",
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
      description:
        "Select workspaces, rename the project, rewrite the README, and remove template files",
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
      const description =
        args.description
        ?? (shouldAcceptDefaults
          ? ""
          : await promptForText("Describe the project in one sentence", ""))
      const shouldInitializeGit =
        args.git
        ?? (shouldAcceptDefaults
          ? true
          : await promptForConfirmation("Initialize a git repository?"))
      const shouldInstall =
        args.install
        ?? (shouldAcceptDefaults ? true : await promptForConfirmation("Run pnpm install?"))

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
      await writeReadme(rootDir, projectName, description.trim())

      if (shouldInitializeGit && !existsSync(join(rootDir, ".git")))
        await runCommand(["git", "init"], rootDir)
      if (shouldInstall) {
        // Removing workspaces changes the lockfile, which pnpm refuses to do by default in CI.
        await runCommand(["pnpm", "install", "--no-frozen-lockfile"], rootDir)
        await runCommand(["pnpm", "run", "codegen"], rootDir)
      }
      // Prebuild regenerates the committed native projects from app.config.js, but it can only
      // install CocoaPods on macOS.
      if (selection.keepApps.includes("mobile")) {
        if (shouldInstall && process.platform === "darwin")
          await runCommand(["pnpm", "run", "--filter", "mobile", "prebuild"], rootDir)
        else
          consola.warn(
            "Run `pnpm run --filter mobile prebuild` on macOS to rename the native iOS and Android projects."
          )
      }
      // Renaming the scope changes how imports sort, and prebuild writes unformatted native project
      // files, so setup formats the result last.
      if (shouldInstall) await runCommand(["pnpm", "run", "fix"], rootDir)
      else
        consola.warn(
          "After `pnpm install`, run `pnpm run codegen` and `pnpm run fix` to sort the renamed imports."
        )

      const leftovers = await findLeftovers(rootDir, projectName)
      if (leftovers.length > 0) {
        for (const leftover of leftovers) consola.error(leftover)
        process.exitCode = 1
        return
      }

      await rm(SETUP_SKILL_DIR, { force: true, recursive: true })
      consola.success("Template setup complete.")
    },
  })
)
