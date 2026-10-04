import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import type * as z from "zod"

import {
  BundledModulesSchema,
  ManifestSchema,
  readPackageJson,
  SentryAnswersSchema,
  TrustedDependenciesSchema,
} from "../schemas"

type SentryApp = z.infer<typeof SentryAnswersSchema>["app"]

type Edit = {
  path: string
  marker: string
  imports?: readonly string[]
  replacements: ReadonlyArray<readonly [anchor: string, replacement: string]>
  append?: string
  manual: string
}

type SentrySetup = {
  sdk: string
  install: (appPath: string) => Promise<unknown>
  file: { path: string; templateFile: string }
  environment: string
  edits: readonly Edit[]
  nextSteps: readonly string[]
}

const SENTRY_APPS = SentryAnswersSchema.shape.app.options

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
    return `[SKIPPED] ${path} already uses Sentry`
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

  await Bun.write(path, edit.append ? `${source.trimEnd()}\n${edit.append}` : source)
  return `${path}: connected Sentry`
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

async function getDependencyVersion(appPath: string, packageName: string, dependency: string) {
  const path = Bun.resolveSync(`${packageName}/package.json`, `${process.cwd()}/${appPath}`)
  const manifest = await readPackageJson(path)
  const version = manifest.dependencies?.[dependency]

  if (!version) {
    throw new Error(`${packageName} does not declare a version of ${dependency}.`)
  }

  return version.replace(/^[~^]/, "")
}

async function trustSentryCli() {
  const manifest = ManifestSchema.parse(await Bun.file("package.json").json())
  const trusted = TrustedDependenciesSchema.parse(manifest.trustedDependencies) ?? []

  if (trusted.includes("@sentry/cli")) {
    return
  }

  const trustedDependencies = [...trusted, "@sentry/cli"].toSorted()
  await Bun.write(
    "package.json",
    `${JSON.stringify({ ...manifest, trustedDependencies }, null, 2)}\n`
  )
}

const SETUPS: Record<SentryApp, SentrySetup> = {
  api: {
    edits: [
      {
        imports: ['import { drain } from "#shared/monitoring.ts"'],
        manual: "Pass `drain` from #shared/monitoring.ts to `initLogger` in src/shared/logger.ts.",
        marker: "#shared/monitoring.ts",
        path: "src/shared/logger.ts",
        replacements: [["initLogger({\n", "initLogger({\n  drain,\n"]],
      },
      {
        imports: ['import { drain } from "#shared/monitoring.ts"'],
        manual: "Call `await drain?.flush()` in the shutdown handler of src/index.ts.",
        marker: "drain?.flush()",
        path: "src/index.ts",
        replacements: [["  process.exit(0)", "  await drain?.flush()\n  process.exit(0)"]],
      },
      {
        imports: ['import { captureException } from "#shared/monitoring.ts"'],
        manual: "Call `captureException(error)` in `app.onError` in src/routes/index.ts.",
        marker: "captureException(error)",
        path: "src/routes/index.ts",
        replacements: [
          ["  c.var.log.error(error)\n", "  c.var.log.error(error)\n  captureException(error)\n"],
        ],
      },
    ],
    environment: `
# Sentry DSN. Error monitoring and the Sentry log drain stay off without it.
# @optional @public
SENTRY_DSN=

# Enables Sentry SDK diagnostics.
# @public @type=boolean
SENTRY_DEBUG=false
`,
    file: {
      path: "src/shared/monitoring.ts",
      templateFile: "templates/sentry/api-monitoring.ts.hbs",
    },
    install: (appPath) => Bun.$`cd ${appPath} && bun add --exact @sentry/node`,
    nextSteps: [],
    sdk: "@sentry/node",
  },
  app: {
    edits: [
      {
        imports: ['import { initializeMonitoring } from "#shared/monitoring.ts"'],
        manual:
          "Call `initializeMonitoring()` from #shared/monitoring.ts in `getRouter` in src/router.tsx when `router.isServer` is false.",
        marker: "initializeMonitoring()",
        path: "src/router.tsx",
        replacements: [
          [
            "  return router\n}",
            "  if (!router.isServer) {\n    initializeMonitoring()\n  }\n\n  return router\n}",
          ],
        ],
      },
    ],
    environment: `
# Browser Sentry DSN. Error monitoring stays off without it.
# @optional
PUBLIC_SENTRY_DSN=

# Enables browser Sentry diagnostics.
# @type=boolean
PUBLIC_SENTRY_DEBUG=false
`,
    file: {
      path: "src/shared/monitoring.ts",
      templateFile: "templates/sentry/app-monitoring.ts.hbs",
    },
    install: (appPath) => Bun.$`cd ${appPath} && bun add --exact @sentry/browser`,
    nextSteps: [],
    sdk: "@sentry/browser",
  },
  mobile: {
    edits: [
      {
        manual: 'Import "#instrument.ts" before "expo-router/entry" in src/index.ts.',
        marker: "#instrument.ts",
        path: "src/index.ts",
        replacements: [
          ['import "expo-router/entry"', 'import "#instrument.ts"\nimport "expo-router/entry"'],
        ],
      },
      {
        append: "\nexport default Sentry.wrap(RootLayout)\n",
        imports: ['import * as Sentry from "@sentry/react-native"'],
        manual: "Export the root layout in src/app/_layout.tsx wrapped with `Sentry.wrap`.",
        marker: "Sentry.wrap(",
        path: "src/app/_layout.tsx",
        replacements: [["export default function RootLayout() {", "function RootLayout() {"]],
      },
      {
        manual:
          "Build the Metro configuration with `getSentryExpoConfig` from @sentry/react-native/metro.",
        marker: "getSentryExpoConfig",
        path: "metro.config.js",
        replacements: [
          [
            'const { getDefaultConfig } = require("expo/metro-config")',
            'const { getSentryExpoConfig } = require("@sentry/react-native/metro")',
          ],
          ["getDefaultConfig(__dirname)", "getSentryExpoConfig(__dirname)"],
        ],
      },
      {
        manual: 'Add the "@sentry/react-native/expo" config plugin to app.config.js.',
        marker: "@sentry/react-native/expo",
        path: "app.config.js",
        replacements: [
          [
            '    ["expo-dev-client", { launchMode: "most-recent" }],\n',
            '    ["expo-dev-client", { launchMode: "most-recent" }],\n    // Native source map and debug symbol uploads need a Sentry organization, project, and auth token.\n    ...(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN\n      ? [\n          [\n            "@sentry/react-native/expo",\n            { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT },\n          ],\n        ]\n      : []),\n',
          ],
        ],
      },
    ],
    environment: `
# Expo Sentry DSN. Error monitoring stays off without it.
# @optional @sensitive=false
EXPO_PUBLIC_SENTRY_DSN=

# Sentry organization slug that build tooling uploads source maps to.
# @optional
SENTRY_ORG=

# Sentry project slug that build tooling uploads source maps to.
# @optional
SENTRY_PROJECT=

# Credential that build tooling uses to upload source maps.
# @optional @sensitive
SENTRY_AUTH_TOKEN=
`,
    file: { path: "src/instrument.ts", templateFile: "templates/sentry/mobile-instrument.ts.hbs" },
    install: async (appPath) => {
      await trustSentryCli()
      const version = await getExpoCompatibleVersion(appPath, "@sentry/react-native")
      await Bun.$`cd ${appPath} && bun add --exact @sentry/react-native@${version}`

      // Bun's isolated linker does not expose the SDK's own @sentry/cli to the workspace, and the
      // native build hooks resolve the CLI from the workspace.
      const cliVersion = await getDependencyVersion(appPath, "@sentry/react-native", "@sentry/cli")
      return Bun.$`cd ${appPath} && bun add --dev --exact @sentry/cli@${cliVersion}`
    },
    nextSteps: [
      "Run `bun run --filter mobile prebuild` to add Sentry to the native iOS and Android projects. Set SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN before prebuild to upload source maps and debug symbols from release builds.",
    ],
    sdk: "@sentry/react-native",
  },
}

export function registerSentryGenerator(plop: PlopTypes.NodePlopAPI) {
  const apps = [
    ...new Bun.Glob("*/package.json").scanSync({
      cwd: `${process.cwd()}/apps`,
    }),
  ]
    .map((entry) => entry.split("/")[0])
    .filter((app): app is SentryApp => SENTRY_APPS.some((sentryApp) => sentryApp === app))
    .toSorted()

  plop.setGenerator("sentry", {
    actions: (rawAnswers) => {
      const { app } = SentryAnswersSchema.parse(rawAnswers)
      const appPath = `apps/${app}`
      const setup = SETUPS[app]

      return [
        async () => {
          const packageJson = await readPackageJson(`${appPath}/package.json`)

          if (setup.sdk in { ...packageJson.dependencies, ...packageJson.devDependencies }) {
            return `[SKIPPED] ${appPath} already contains ${setup.sdk}`
          }

          await setup.install(appPath)
          return `${appPath}: installed the Sentry SDK`
        },
        {
          path: `${appPath}/${setup.file.path}`,
          skipIfExists: true,
          templateFile: setup.file.templateFile,
          type: "add",
        },
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
            return `[SKIPPED] ${schemaPath} already declares the Sentry variables`
          }

          await Bun.write(schemaPath, `${schema.trimEnd()}\n\n${missing.join("\n\n")}\n`)
          return `${schemaPath}: added the optional Sentry variables`
        },
        ...setup.edits.map((edit) => () => applyEdit(`${appPath}/${edit.path}`, edit)),
        ...setup.nextSteps.map((step) => () => step),
        () => "Run `bun run codegen` and `bun run fix`, then `bun template doctor`.",
      ]
    },
    description: "Add optional Sentry error monitoring to an application workspace",
    prompts: [
      {
        choices:
          apps.length > 0
            ? apps.map((app) => ({ name: app, value: app }))
            : [{ name: "No supported apps found (api, app, mobile)", value: "" }],
        message: "Which app should report to Sentry?",
        name: "app",
        type: "list",
      },
    ],
  })
}
