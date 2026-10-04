import { dirname, join, relative, resolve } from "node:path"
import { defineCommand } from "citty"
import consola from "consola"
import * as z from "zod"

import {
  checkIsRemovedByCleanup,
  findTextReferences,
  getProjectScope,
  getScopePrefix,
  getWorkspaceGraph,
  getWorkspacePath,
  readPackageJson,
  readTemplateStamp,
  removeTemplateSections,
  TEMPLATE_SCOPE,
  TEMPLATE_SECTION_START,
  TEMPLATE_STAMP_FILE,
  TemplateCleanupSchema,
  type TemplateStamp,
  type WorkspaceNode,
} from "./shared"

type Context = {
  envFiles: string[]
  rootDir: string
  scope: string
  stamp: TemplateStamp | undefined
  workspaces: WorkspaceNode[]
}

type Check = {
  name: string
  run: (context: Context) => Promise<string[]>
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

const TurboJsonSchema = z.object({
  tasks: z.record(z.string(), z.looseObject({ env: z.array(z.string()).optional() })),
})

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
    patterns.map((pattern) =>
      Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: rootDir, dot: true }))
    )
  )

  return files.flat().map((path) => join(rootDir, path))
}

function matchDirectives(contents: string, directive: string) {
  return [
    ...contents.matchAll(new RegExp(`@${directive}\\(path=([^,)]+)|@${directive}\\(([^,)]+)`, "g")),
  ]
    .map((match) => match[1] ?? match[2])
    .filter((path): path is string => path !== undefined)
}

async function checkEnvPaths(context: Context, directive: string, label: string) {
  const failures = await Promise.all(
    context.envFiles.map(async (file) => {
      const contents = await Bun.file(file).text()
      const missing = await Promise.all(
        matchDirectives(contents, directive).map(async (path) => {
          const target = resolve(dirname(file), path)
          return (await Bun.file(target).exists()) ? undefined : path
        })
      )

      return missing
        .filter((path): path is string => path !== undefined)
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
    name: "Package source takes configuration as arguments",
    run: async ({ rootDir, workspaces }) => {
      const sourceFiles = new Bun.Glob("src/**/*.{ts,tsx}")
      const packages = workspaces.filter((workspace) => workspace.kind === "package")

      const failures = await Promise.all(
        packages.map(async (workspace) => {
          const files = [...sourceFiles.scanSync({ cwd: workspace.directory })].filter(
            (file) => !file.endsWith("env.generated.ts")
          )
          const readers = await Promise.all(
            files.map(async (file) => {
              const contents = await Bun.file(join(workspace.directory, file)).text()
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
      const turbo = TurboJsonSchema.parse(await Bun.file(join(rootDir, "turbo.json")).json())
      const patterns = turbo.tasks.build?.env ?? []
      const contents = await Promise.all(envFiles.map((file) => Bun.file(file).text()))
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
      const config = await Bun.file(join(rootDir, "knip.config.ts")).text()
      const paths = new Set(workspaces.map((workspace) => getWorkspacePath(workspace)))

      return [...config.matchAll(/^\s+"((?:apps|packages)\/[^*"]+)":/gm)]
        .map((match) => match[1])
        .filter((path): path is string => path !== undefined && !paths.has(path))
        .map((path) => `knip.config.ts configures ${path}, which does not exist`)
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
        const missingPaths = await Promise.all(
          cleanupPaths.map(async (path) =>
            (await Bun.file(join(rootDir, path)).exists()) ? undefined : path
          )
        )

        return [
          ...missingPaths
            .filter((path): path is string => path !== undefined)
            .map((path) => `v1.cleanupPaths lists ${path}, which does not exist`),
          ...cleanupSections
            .filter((path) => !markedFiles.includes(join(rootDir, path)))
            .map((path) => `v1.cleanupSections lists ${path}, which has no TEMPLATE:START marker`),
        ]
      }

      return [
        ...(stamp.commit ? [] : [`${TEMPLATE_STAMP_FILE} does not record the template commit`]),
        ...("v1" in packageJson ? ["package.json still has the v1 field"] : []),
        ...("bun-create" in packageJson ? ["package.json still has the bun-create field"] : []),
        ...markedFiles.map((path) => `${relative(rootDir, path)} still has TEMPLATE:START markers`),
      ]
    },
  },
  {
    name: "AGENTS.md references docs that setup keeps",
    run: async ({ rootDir }) => {
      const agentsFile = Bun.file(join(rootDir, "AGENTS.md"))
      if (!(await agentsFile.exists())) return []

      const packageJson = await readPackageJson(join(rootDir, "package.json"))
      const cleanup = TemplateCleanupSchema.safeParse(packageJson.v1)
      const cleanupPaths = cleanup.success ? cleanup.data.cleanupPaths : []
      const references = new Set(
        removeTemplateSections(await agentsFile.text()).match(/docs\/[\w-]+\.md/g)
      )
      const failures = await Promise.all(
        [...references].map(async (path) => {
          if (!(await Bun.file(join(rootDir, path)).exists()))
            return `AGENTS.md references ${path}, which does not exist`
          if (checkIsRemovedByCleanup(rootDir, path, cleanupPaths))
            return `AGENTS.md references ${path}, which v1.cleanupPaths removes during setup`
          return null
        })
      )

      return failures.filter((failure): failure is string => failure !== null)
    },
  },
  {
    name: "Backend connections have their backend workspace",
    run: async ({ workspaces }) => {
      const apps = workspaces.filter((workspace) => workspace.kind === "app")
      const failures = await Promise.all(
        apps.flatMap((app) =>
          BACKEND_MARKERS.map(async ({ backend, file }) => {
            if (!(await Bun.file(join(app.directory, file)).exists())) return []

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
      )

      return failures.flat()
    },
  },
]

async function runTool(rootDir: string, command: readonly string[]) {
  const result = await Bun.$`bun run ${command}`
    .cwd(rootDir)
    .env({ ...process.env, VARLOCK_ENV: process.env.VARLOCK_ENV ?? "development" })
    .quiet()
    .nothrow()
  if (result.exitCode === 0) return []

  return [
    `bun run ${command.join(" ")} failed:\n${result.stdout.toString()}${result.stderr.toString()}`,
  ]
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
    const context: Context = {
      envFiles: await collectEnvFiles(rootDir),
      rootDir,
      scope: await getProjectScope(rootDir),
      stamp: await readTemplateStamp(rootDir),
      workspaces: await getWorkspaceGraph(rootDir),
    }
    const tools = TOOL_COMMANDS.filter((command) => !(args.fast && command[0] === "build"))
    const steps = [
      ...checks.map(
        (check) => () => check.run(context).then((failures) => report(check.name, failures))
      ),
      ...tools.map(
        (command) => () =>
          runTool(rootDir, command).then((failures) => report(`bun run ${command[0]}`, failures))
      ),
    ]
    const failed = await steps.reduce(async (previous, step) => {
      const previousFailed = await previous
      const stepFailed = await step()
      return previousFailed || stepFailed
    }, Promise.resolve(false))

    if (failed) {
      consola.error("The doctor found problems. Fix them and run bun template doctor again.")
      process.exitCode = 1
      return
    }

    consola.success("The project is healthy.")
  },
})
