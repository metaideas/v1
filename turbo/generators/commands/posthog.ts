import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import type * as z from "zod"

import { BundledModulesSchema, PostHogAnswersSchema, readPackageJson } from "../schemas"

type PostHogApp = z.infer<typeof PostHogAnswersSchema>["app"]

type Edit = {
  path: string
  marker: string
  imports?: readonly string[]
  replacements: ReadonlyArray<readonly [anchor: string, replacement: string]>
  manual: string
}

type PostHogSetup = {
  sdk: string
  install: (appPath: string) => Promise<unknown>
  files: ReadonlyArray<{ path: string; templateFile: string }>
  environment: string
  edits: readonly Edit[]
  nextSteps: readonly string[]
}

const POSTHOG_APPS = PostHogAnswersSchema.shape.app.options

// The Expo modules PostHog reads device, app, and locale details from.
const EXPO_PEER_MODULES = [
  "expo-application",
  "expo-device",
  "expo-file-system",
  "expo-localization",
] as const

function addImport(source: string, line: string) {
  if (source.includes(line)) {
    return source
  }

  const lines = source.split("\n")
  const lastImport = lines.findLastIndex((text) => /^(import .+|\}) from "[^"]+"$/.test(text))
  lines.splice(lastImport + 1, 0, line)

  return lines.join("\n")
}

async function applyEdit(path: string, edit: Edit) {
  const file = Bun.file(path)

  if (!(await file.exists())) {
    return `[MANUAL] ${path} is missing. ${edit.manual}`
  }

  let source = await file.text()

  if (source.includes(edit.marker)) {
    return `[SKIPPED] ${path} already uses PostHog`
  }

  if (edit.replacements.some(([anchor]) => !source.includes(anchor))) {
    return `[MANUAL] ${path} changed since generation. ${edit.manual}`
  }

  for (const [anchor, replacement] of edit.replacements) {
    source = source.replace(anchor, replacement)
  }

  for (const line of edit.imports ?? []) {
    source = addImport(source, line)
  }

  await Bun.write(path, source)
  return `${path}: connected PostHog`
}

// `expo install` cannot edit a dynamic app.config.js and writes a range, so read the version the
// installed Expo SDK supports and pin it.
async function getExpoCompatibleVersion(appPath: string, name: string) {
  const path = Bun.resolveSync("expo/bundledNativeModules.json", `${process.cwd()}/${appPath}`)
  const versions = BundledModulesSchema.parse(await Bun.file(path).json())
  const range = versions[name]

  if (!range) {
    throw new Error(`The installed Expo SDK does not declare a version of ${name}.`)
  }

  return range.replace(/^[~^]/, "")
}

const SETUPS: Record<PostHogApp, PostHogSetup> = {
  api: {
    edits: [
      {
        imports: ['import { analytics } from "#shared/analytics.ts"'],
        manual: "Call `await analytics?.shutdown()` in the shutdown handler of src/index.ts.",
        marker: "analytics?.shutdown()",
        path: "src/index.ts",
        replacements: [["  process.exit(0)", "  await analytics?.shutdown()\n  process.exit(0)"]],
      },
    ],
    environment: `
# Server PostHog project key. Product analytics stays off without it.
# @optional
POSTHOG_API_KEY=

# PostHog ingestion endpoint.
# @public @type=url
POSTHOG_HOST=https://us.i.posthog.com
`,
    files: [
      { path: "src/shared/analytics.ts", templateFile: "templates/posthog/api-analytics.ts.hbs" },
    ],
    install: (appPath) => Bun.$`cd ${appPath} && bun add --exact posthog-node`,
    nextSteps: ["Capture server events with `analytics?.capture()` from #shared/analytics.ts."],
    sdk: "posthog-node",
  },
  app: {
    edits: [
      {
        imports: ['import AnalyticsProvider from "#shared/components/analytics-provider.tsx"'],
        manual:
          "Wrap the providers in src/shared/components/providers.tsx with the default export of #shared/components/analytics-provider.tsx.",
        marker: "<AnalyticsProvider>",
        path: "src/shared/components/providers.tsx",
        replacements: [
          [
            "    <ThemeProvider setTheme={setTheme} theme={theme}>",
            "    <AnalyticsProvider>\n    <ThemeProvider setTheme={setTheme} theme={theme}>",
          ],
          ["    </ThemeProvider>\n  )", "    </ThemeProvider>\n    </AnalyticsProvider>\n  )"],
        ],
      },
    ],
    environment: `
# Browser PostHog project key. Product analytics stays off without it.
# @optional
PUBLIC_POSTHOG_API_KEY=

# PostHog ingestion endpoint.
# @type=url
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
`,
    files: [
      {
        path: "src/shared/components/analytics-provider.tsx",
        templateFile: "templates/posthog/app-analytics-provider.tsx.hbs",
      },
    ],
    install: (appPath) => Bun.$`cd ${appPath} && bun add --exact posthog-js`,
    nextSteps: [
      "Call `usePostHog().identify(user.id)` from posthog-js/react once a session loads.",
    ],
    sdk: "posthog-js",
  },
  mobile: {
    edits: [
      {
        imports: ['import AnalyticsProvider from "#shared/components/analytics-provider.tsx"'],
        manual:
          "Wrap the providers in src/shared/components/providers.tsx with the default export of #shared/components/analytics-provider.tsx.",
        marker: "<AnalyticsProvider>",
        path: "src/shared/components/providers.tsx",
        replacements: [
          [
            "  return (\n    <PersistQueryClientProvider",
            "  return (\n    <AnalyticsProvider>\n    <PersistQueryClientProvider",
          ],
          [
            "    </PersistQueryClientProvider>\n  )",
            "    </PersistQueryClientProvider>\n    </AnalyticsProvider>\n  )",
          ],
        ],
      },
    ],
    environment: `
# Expo PostHog project key. Product analytics stays off without it.
# @optional
EXPO_PUBLIC_POSTHOG_API_KEY=

# PostHog ingestion endpoint.
# @type=url
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
`,
    files: [
      {
        path: "src/shared/components/analytics-provider.tsx",
        templateFile: "templates/posthog/mobile-analytics-provider.tsx.hbs",
      },
      {
        path: "src/shared/use-screen-tracking.ts",
        templateFile: "templates/posthog/mobile-use-screen-tracking.ts.hbs",
      },
    ],
    install: async (appPath) => {
      const modules = await Promise.all(
        EXPO_PEER_MODULES.map(
          async (name) => `${name}@${await getExpoCompatibleVersion(appPath, name)}`
        )
      )
      return Bun.$`cd ${appPath} && bun add --exact posthog-react-native ${modules}`
    },
    nextSteps: [
      "Call `usePostHog()?.identify(user.id)` from posthog-react-native once a session loads. The hook returns undefined when no project key is set.",
      "Run `bun run --filter mobile prebuild` to add the Expo modules to the native iOS and Android projects.",
    ],
    sdk: "posthog-react-native",
  },
}

export function registerPostHogGenerator(plop: PlopTypes.NodePlopAPI) {
  const apps = [
    ...new Bun.Glob("*/package.json").scanSync({
      cwd: `${process.cwd()}/apps`,
    }),
  ]
    .map((entry) => entry.split("/")[0])
    .filter((app): app is PostHogApp => POSTHOG_APPS.some((posthogApp) => posthogApp === app))
    .toSorted()

  plop.setGenerator("posthog", {
    actions: (rawAnswers) => {
      const { app } = PostHogAnswersSchema.parse(rawAnswers)
      const appPath = `apps/${app}`
      const setup = SETUPS[app]

      return [
        async () => {
          const packageJson = await readPackageJson(`${appPath}/package.json`)

          if (setup.sdk in { ...packageJson.dependencies, ...packageJson.devDependencies }) {
            return `[SKIPPED] ${appPath} already contains ${setup.sdk}`
          }

          await setup.install(appPath)
          return `${appPath}: installed the PostHog SDK`
        },
        ...setup.files.map((file) => ({
          path: `${appPath}/${file.path}`,
          skipIfExists: true,
          templateFile: file.templateFile,
          type: "add" as const,
        })),
        async () => {
          const schemaPath = `${appPath}/.env.schema`
          const schema = await Bun.file(schemaPath).text()
          const missing = setup.environment
            .trim()
            .split("\n\n")
            .filter((declaration) => {
              const key = /^([A-Z0-9_]+)=/m.exec(declaration)?.[1]
              return key !== undefined && !new RegExp(`^${key}=`, "m").test(schema)
            })

          if (missing.length === 0) {
            return `[SKIPPED] ${schemaPath} already declares the PostHog variables`
          }

          await Bun.write(schemaPath, `${schema.trimEnd()}\n\n${missing.join("\n\n")}\n`)
          return `${schemaPath}: added the optional PostHog variables`
        },
        ...setup.edits.map((edit) => () => applyEdit(`${appPath}/${edit.path}`, edit)),
        ...setup.nextSteps.map((step) => () => step),
        () => "Run `bun run codegen` and `bun run fix`, then `bun template doctor`.",
      ]
    },
    description: "Add optional PostHog product analytics to an application workspace",
    prompts: [
      {
        choices:
          apps.length > 0
            ? apps.map((app) => ({ name: app, value: app }))
            : [{ name: "No supported apps found (api, app, mobile)", value: "" }],
        message: "Which app should send product analytics to PostHog?",
        name: "app",
        type: "list",
      },
    ],
  })
}
