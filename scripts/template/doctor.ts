import { spawnSync } from "node:child_process"
import { existsSync, globSync, readdirSync } from "node:fs"
import { glob, readFile } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"
import { defineCommand } from "citty"
import { parseJSONC } from "confbox"
import consola from "consola"

import {
  KnipConfigModuleSchema,
  type TemplateStamp,
  TemplateCleanupSchema,
  TurboJsonSchema,
} from "./schemas.ts"
import {
  checkIsRemovedByCleanup,
  findPackageOwnedCoreServices,
  findTextReferences,
  findUnknownKnipWorkspaces,
  getProjectScope,
  getScopePrefix,
  getWorkspaceGraph,
  getWorkspacePath,
  readPackageJson,
  readTemplateStamp,
  removeTemplateSections,
  TEMPLATE_REPO,
  TEMPLATE_SCOPE,
  TEMPLATE_SECTION_START,
  TEMPLATE_STAMP_FILE,
  type WorkspaceNode,
} from "./shared.ts"

type Context = {
  envFiles: string[]
  rootDir: string
  scope: string
  stamp: TemplateStamp | undefined
  workspaces: WorkspaceNode[]
}

type Check = {
  name: string
  run: (context: Context) => string[] | Promise<string[]>
}

const BACKEND_MARKERS = [
  { backend: { kind: "app", name: "api" }, file: "src/shared/api.ts" },
  { backend: { kind: "app", name: "api" }, file: "src/shared/trpc.tsx" },
  {
    backend: { kind: "package", name: "backend" },
    file: "src/shared/components/convex-provider.tsx",
  },
] as const

// Package workspaces that any package can build on. Every other package workspace is a capability
// that an application composes, so packages never depend on each other.
const FOUNDATION_PACKAGES = new Set(["core", "ui", "utils"])

// `packages/backend` deploys on its own and composes packages the way an application does.
const COMPOSING_PACKAGES = new Set(["backend"])

// A value import of the generated `ENV`. Type-only imports are erased, so they are allowed.
const ENV_VALUE_IMPORT =
  /^(?:import|export)\s+(?!type\b)(?:\{[^}]*\}|[^"'\n{]*)\s*from\s*["'][^"']*env\.generated(?:\.ts)?["']/m

const TOOL_COMMANDS = [
  ["check"],
  ["boundaries"],
  ["analyze"],
  ["env:check"],
  ["build", "--output-logs=errors-only"],
] as const

async function collectEnvFiles(rootDir: string) {
  const patterns = ["{apps,packages}/*/.env.schema", "packages/*/env/.env.*"]

  const files = await Promise.all(
    patterns.map((pattern) => Array.fromAsync(glob(pattern, { cwd: rootDir })))
  )

  return files.flat().map((path) => join(rootDir, path))
}

function matchDirectives(contents: string, directive: string) {
  return contents
    .matchAll(new RegExp(`@${directive}\\(path=([^,)]+)|@${directive}\\(([^,)]+)`, "g"))
    .map((match) => match[1] ?? match[2])
    .filter((path): path is string => path !== undefined)
    .toArray()
}

async function checkEnvPaths(context: Context, directive: string, label: string) {
  const failures = await Promise.all(
    context.envFiles.map(async (file) => {
      const contents = await readFile(file, "utf8")

      return matchDirectives(contents, directive)
        .filter((path) => !existsSync(resolve(dirname(file), path)))
        .map((path) => `${relative(context.rootDir, file)} ${label} ${path}, which does not exist`)
    })
  )

  return failures.flat()
}

const checks: Check[] = [
  {
    name: "Template scope is fully renamed",
    run: async ({ rootDir, scope }) => {
      if (scope === TEMPLATE_SCOPE) return []

      const files = await findTextReferences(rootDir, getScopePrefix(TEMPLATE_SCOPE))

      return files
        .map((path) => relative(rootDir, path))
        .filter((path) => path !== TEMPLATE_STAMP_FILE)
        .map((path) => `${path} still references ${getScopePrefix(TEMPLATE_SCOPE)}`)
    },
  },
  {
    name: "Workspace dependencies resolve and flow from apps to packages",
    run: ({ scope, workspaces }) => {
      const byPackageName = new Map(workspaces.map((entry) => [entry.packageName, entry]))
      const prefix = getScopePrefix(scope)

      const failures = workspaces.flatMap((workspace) =>
        workspace.dependencies.flatMap((dependency) => {
          const target = byPackageName.get(dependency)

          if (!target && dependency.startsWith(prefix))
            return [
              `${getWorkspacePath(workspace)} depends on ${dependency}, which is not a workspace`,
            ]

          if (target?.kind === "app" && workspace.kind === "package")
            return [
              `${getWorkspacePath(workspace)} depends on the ${getWorkspacePath(target)} application`,
            ]

          return []
        })
      )

      return Promise.resolve(failures)
    },
  },
  {
    name: "Package workspaces depend only on foundation packages",
    run: ({ workspaces }) => {
      const packages = new Map(
        workspaces
          .filter((workspace) => workspace.kind === "package")
          .map((workspace) => [workspace.packageName, workspace])
      )

      const failures = [...packages.values()]
        .filter((workspace) => !COMPOSING_PACKAGES.has(workspace.name))
        .flatMap((workspace) =>
          workspace.dependencies.flatMap((dependency) => {
            const target = packages.get(dependency)

            if (!target || FOUNDATION_PACKAGES.has(target.name)) return []

            return [
              `${getWorkspacePath(workspace)} depends on ${getWorkspacePath(target)}. Declare the interface it needs and let the application pass an implementation.`,
            ]
          })
        )

      return Promise.resolve(failures)
    },
  },
  {
    name: "Core services are contracts that several packages share",
    run: ({ rootDir, workspaces }) => {
      const packages = workspaces.filter((workspace) => workspace.kind === "package")
      const core = packages.find((workspace) => workspace.name === "core")
      const servicesDir = core ? join(core.directory, "src/services") : undefined

      if (!servicesDir || !existsSync(servicesDir)) return []

      const services = readdirSync(servicesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)

      return findPackageOwnedCoreServices(
        services,
        new Set(packages.map((workspace) => workspace.name))
      ).map(
        (name) =>
          `${relative(rootDir, join(servicesDir, name))} belongs to packages/${name}. Move it into packages/${name}/src and export it from that package.`
      )
    },
  },
  {
    name: "Package source takes configuration as arguments",
    run: async ({ rootDir, workspaces }) => {
      const packages = workspaces.filter((workspace) => workspace.kind === "package")

      const failures = await Promise.all(
        packages.map(async (workspace) => {
          const files = globSync("src/**/*.{ts,tsx}", { cwd: workspace.directory }).filter(
            (file) => !file.endsWith("env.generated.ts")
          )

          const readers = await Promise.all(
            files.map(async (file) => {
              const contents = await readFile(join(workspace.directory, file), "utf8")

              return ENV_VALUE_IMPORT.test(contents) ? [file] : []
            })
          )

          return readers
            .flat()
            .map(
              (file) =>
                `${relative(rootDir, join(workspace.directory, file))} reads ENV. Take configuration as factory arguments and let the application pass values from its ENV.`
            )
        })
      )

      return failures.flat()
    },
  },
  {
    name: "Environment imports point at existing fragments",
    run: (context) => checkEnvPaths(context, "import", "imports"),
  },
  {
    name: "Generated environment types exist",
    run: (context) => checkEnvPaths(context, "generateTsTypes", "generates"),
  },
  {
    name: "Turbo build env entries are declared by a schema",
    run: async ({ envFiles, rootDir }) => {
      const turbo = TurboJsonSchema.parse(
        parseJSONC(await readFile(join(rootDir, "turbo.json"), "utf8"), {
          allowTrailingComma: true,
        })
      )

      const patterns = turbo.tasks.build?.env ?? []
      const contents = await Promise.all(envFiles.map((file) => readFile(file, "utf8")))

      const keys = contents.flatMap((text) =>
        [...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1])
      )

      return patterns
        .filter((pattern) => {
          const matcher = new RegExp(`^${pattern.replaceAll("*", ".*")}$`)

          return !keys.some((key) => key !== undefined && matcher.test(key))
        })
        .map(
          (pattern) =>
            `turbo.json build.env lists ${pattern}, which no environment contract declares`
        )
    },
  },
  {
    name: "Knip workspaces exist",
    run: async ({ rootDir, workspaces }) => {
      const { default: config } = KnipConfigModuleSchema.parse(
        await import(join(rootDir, "knip.config.ts"))
      )

      const paths = new Set(workspaces.map((workspace) => getWorkspacePath(workspace)))

      return findUnknownKnipWorkspaces(config, paths).map(
        (path) => `knip.config.ts configures ${path}, which does not exist`
      )
    },
  },
  {
    name: "Template-only content matches the project state",
    run: async ({ rootDir, stamp }) => {
      const packageJson = await readPackageJson(join(rootDir, "package.json"))
      const cleanup = TemplateCleanupSchema.safeParse(packageJson.v1)
      const allMarkedFiles = await findTextReferences(rootDir, TEMPLATE_SECTION_START)

      const markedFiles = allMarkedFiles.filter(
        (path) => !relative(rootDir, path).startsWith("scripts/")
      )

      if (!stamp) {
        if (!cleanup.success) {
          return [
            "package.json needs v1.cleanupPaths and v1.cleanupSections arrays so setup can remove template content",
          ]
        }

        const { cleanupPaths, cleanupSections } = cleanup.data

        return [
          ...cleanupPaths
            .filter((path) => !existsSync(join(rootDir, path)))
            .map((path) => `v1.cleanupPaths lists ${path}, which does not exist`),
          ...cleanupSections
            .filter((path) => !markedFiles.includes(join(rootDir, path)))
            .map((path) => `v1.cleanupSections lists ${path}, which has no TEMPLATE:START marker`),
        ]
      }

      return [
        ...(stamp.commit ? [] : [`${TEMPLATE_STAMP_FILE} does not record the template commit`]),
        ...("v1" in packageJson ? ["package.json still has the v1 field"] : []),
        ...markedFiles.map((path) => `${relative(rootDir, path)} still has TEMPLATE:START markers`),
      ]
    },
  },
  {
    name: "README.md describes the project",
    run: async ({ rootDir, stamp }) => {
      const readmePath = join(rootDir, "README.md")

      if (!stamp || !existsSync(readmePath)) return []
      const contents = await readFile(readmePath, "utf8")

      if (!contents.includes(`bun create ${TEMPLATE_REPO}`)) return []

      return [
        "README.md is still the template README. Rewrite it to describe the project and its workspaces",
      ]
    },
  },
  {
    name: "AGENTS.md references docs that setup keeps",
    run: async ({ rootDir }) => {
      const agentsPath = join(rootDir, "AGENTS.md")

      if (!existsSync(agentsPath)) return []

      const packageJson = await readPackageJson(join(rootDir, "package.json"))
      const cleanup = TemplateCleanupSchema.safeParse(packageJson.v1)
      const cleanupPaths = cleanup.success ? cleanup.data.cleanupPaths : []

      const references = new Set(
        removeTemplateSections(await readFile(agentsPath, "utf8")).match(/docs\/[\w-]+\.md/g)
      )

      return [...references].flatMap((path) => {
        if (!existsSync(join(rootDir, path)))
          return [`AGENTS.md references ${path}, which does not exist`]

        if (checkIsRemovedByCleanup(rootDir, path, cleanupPaths))
          return [`AGENTS.md references ${path}, which v1.cleanupPaths removes during setup`]

        return []
      })
    },
  },
  {
    name: "Backend connections have their backend workspace",
    run: ({ workspaces }) => {
      const apps = workspaces.filter((workspace) => workspace.kind === "app")

      return apps.flatMap((app) =>
        BACKEND_MARKERS.flatMap(({ backend, file }) => {
          if (!existsSync(join(app.directory, file))) return []

          const target = workspaces.find(
            (workspace) => workspace.kind === backend.kind && workspace.name === backend.name
          )

          const appPath = getWorkspacePath(app)
          const backendPath = getWorkspacePath(backend)

          if (!target) return [`${appPath}/${file} needs ${backendPath}, which does not exist`]

          if (!app.dependencies.includes(target.packageName))
            return [`${appPath}/${file} needs ${appPath} to depend on ${target.packageName}`]

          return []
        })
      )
    },
  },
]

function runTool(rootDir: string, command: readonly string[]) {
  const result = spawnSync("pnpm", ["run", ...command], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, VARLOCK_ENV: process.env.VARLOCK_ENV ?? "development" },
    maxBuffer: Number.POSITIVE_INFINITY,
  })

  if (result.status === 0) return []

  return [`pnpm run ${command.join(" ")} failed:\n${result.stdout}${result.stderr}`]
}

function report(name: string, failures: string[]) {
  if (failures.length === 0) {
    consola.success(name)

    return false
  }

  consola.fail(name)

  for (const failure of failures) consola.log(`  - ${failure}`)

  return true
}

export default defineCommand({
  args: {
    fast: {
      description: "Skip the build step",
      type: "boolean",
    },
  },
  meta: {
    description:
      "Verify the workspace selection, environment contracts, and tooling of the project",
    name: "doctor",
  },
  run: async ({ args }) => {
    const rootDir = process.cwd()

    const context = {
      envFiles: await collectEnvFiles(rootDir),
      rootDir,
      scope: await getProjectScope(rootDir),
      stamp: await readTemplateStamp(rootDir),
      workspaces: await getWorkspaceGraph(rootDir),
    }

    const tools = TOOL_COMMANDS.filter((command) => !(args.fast && command[0] === "build"))

    const steps = [
      ...checks.map((check) => async () => report(check.name, await check.run(context))),
      ...tools.map((command) => () => report(`pnpm run ${command[0]}`, runTool(rootDir, command))),
    ]

    const failed = await steps.reduce(async (previous, step) => {
      const previousFailed = await previous
      const stepFailed = await step()

      return previousFailed || stepFailed
    }, Promise.resolve(false))

    if (failed) {
      consola.error("The doctor found problems. Fix them and run pnpm template doctor again.")
      process.exitCode = 1

      return
    }

    consola.success("The project is healthy.")
  },
})
