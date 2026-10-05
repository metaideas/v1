import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import { addImports } from "../imports"
import { NewFeatureAnswersSchema } from "../schemas"

const FRONTEND_APPS: readonly string[] = ["app", "desktop", "extension", "mobile", "web"]
const REACT_APPS: readonly string[] = ["app", "desktop", "extension", "mobile"]
const SERVER_APPS: readonly string[] = ["api", "app", "worker"]
const HANDLER_APPS: readonly string[] = [...SERVER_APPS, "desktop"]
const APPS_WITHOUT_FEATURES = new Set(["docs"])
const KNOWN_APPS = new Set([...APPS_WITHOUT_FEATURES, ...FRONTEND_APPS, ...SERVER_APPS])
const DIRECTORY_ROLES = new Set(["assets", "components"])
const DESKTOP_BRIDGE_PATH = "apps/desktop/src/shell/bridge.ts"
const DESKTOP_ROUTERS = /mergeRouters\((?<routers>[^)]*)\)/

const FEATURE_ROLES: ReadonlyArray<{
  apps?: readonly string[]
  isChecked?: boolean
  name: string
  value: string
}> = [
  { apps: FRONTEND_APPS, name: "assets/ - Static files the components import", value: "assets" },
  {
    apps: FRONTEND_APPS,
    isChecked: true,
    name: "components/ - UI components",
    value: "components",
  },
  { name: "constants.ts - Static values and content", value: "constants" },
  { apps: REACT_APPS, name: "data.ts - Query and mutation options", value: "data" },
  { name: "errors.ts - Errors that stay inside the app", value: "errors" },
  {
    apps: HANDLER_APPS,
    name: "handlers.ts - Server entry points, or main-process handlers in desktop",
    value: "handlers",
  },
  { apps: REACT_APPS, name: "hooks.ts - React hooks for local and derived state", value: "hooks" },
  { isChecked: true, name: "schemas.ts - Schemas for forms and local models", value: "schemas" },
]

function listRoles(app: string) {
  const isKnownApp = KNOWN_APPS.has(app)

  return FEATURE_ROLES.filter(
    (role) =>
      role.apps === undefined
      || role.apps.includes(app)
      || (!isKnownApp && role.apps !== HANDLER_APPS)
  ).map((role) => ({ checked: role.isChecked ?? false, name: role.name, value: role.value }))
}

function templateFor(app: string, file: string) {
  if (file === "handlers") {
    return `handlers/${["api", "desktop", "worker"].includes(app) ? app : "app"}.ts.hbs`
  }

  return `${file}.ts.hbs`
}

/**
 * Names that a desktop feature's handlers share with its schemas and the shell's bridge.
 */
export type DesktopHandlers = {
  bridgePath: string
  contract: string
  feature: string
  key: string
  router: string
  schemasPath: string
}

async function declaresContract({ contract, schemasPath }: DesktopHandlers) {
  const file = Bun.file(schemasPath)

  return (await file.exists()) && new RegExp(`export const ${contract}\\b`).test(await file.text())
}

/**
 * Adds the contract that a desktop feature's handlers serve to its `schemas.ts`, keeping what the
 * file already holds, such as the schemas of a feature generated before it had handlers.
 */
export async function addDesktopContract(handlers: DesktopHandlers) {
  const { contract, key, schemasPath } = handlers

  if (await declaresContract(handlers)) {
    return `[SKIPPED] ${schemasPath} already declares ${contract}`
  }

  const file = Bun.file(schemasPath)
  const source = (await file.exists()) ? await file.text() : ""
  const declaration = `export const ${contract} = defineContract({\n  ${key}: {\n    ping: channel({ input: z.void(), output: z.string() }),\n  },\n})\n`
  const updated = addImports([source.trimEnd(), declaration].filter(Boolean).join("\n\n"), [
    { from: "typedport", imported: "channel" },
    { from: "typedport", imported: "defineContract" },
    { from: "zod", imported: "*", local: "z" },
  ])

  if (updated === undefined) {
    return `[MANUAL] ${schemasPath} already binds a name the contract needs. Declare ${contract} with typedport's defineContract.`
  }

  await Bun.write(schemasPath, updated)
  return `${schemasPath}: declared ${contract}`
}

/**
 * Adds a desktop feature's router to the routers that the shell serves over IPC. It mounts only a
 * router whose contract exists, so a failed contract step leaves the shell buildable.
 */
export async function serveDesktopRouter(handlers: DesktopHandlers) {
  const { bridgePath, contract, feature, router, schemasPath } = handlers
  const manual = `Add ${router} from #features/${feature}/handlers.ts to the mergeRouters call in ${bridgePath}.`

  if (!(await declaresContract(handlers))) {
    return `[MANUAL] ${schemasPath} doesn't declare ${contract}, so ${bridgePath} doesn't serve ${router} yet. ${manual}`
  }

  const file = Bun.file(bridgePath)

  if (!(await file.exists())) {
    return `[MANUAL] ${bridgePath} is missing. ${manual}`
  }

  const source = await file.text()

  if (source.includes(router)) {
    return `[SKIPPED] ${bridgePath} already serves ${router}`
  }

  const routers = DESKTOP_ROUTERS.exec(source)?.groups?.routers

  if (routers === undefined) {
    return `[MANUAL] ${bridgePath} changed since generation. ${manual}`
  }

  const listed = [...routers.split(","), router].map((name) => name.trim()).filter(Boolean)
  const updated = addImports(
    source.replace(DESKTOP_ROUTERS, `mergeRouters(${listed.join(", ")})`),
    [{ from: `#features/${feature}/handlers.ts`, imported: router }]
  )

  if (updated === undefined) {
    return `[MANUAL] ${bridgePath} already binds ${router}. ${manual}`
  }

  await Bun.write(bridgePath, updated)
  return `${bridgePath}: served ${router}`
}

export function registerNewFeatureGenerator(plop: PlopTypes.NodePlopAPI) {
  const apps = [
    ...new Bun.Glob("*/package.json").scanSync({
      cwd: `${process.cwd()}/apps`,
    }),
  ]
    .map((entry) => entry.split("/")[0])
    .filter((app): app is string => app !== undefined && !APPS_WITHOUT_FEATURES.has(app))
    .toSorted()

  plop.setGenerator("new-feature", {
    actions: (rawAnswers) => {
      const {
        app,
        files: selectedFiles,
        name,
      } = Object.assign(rawAnswers ?? {}, NewFeatureAnswersSchema.parse(rawAnswers))
      const hasDesktopHandlers = app === "desktop" && selectedFiles.includes("handlers")
      const files =
        hasDesktopHandlers && !selectedFiles.includes("schemas")
          ? [...selectedFiles, "schemas"]
          : selectedFiles
      const featurePath = "apps/{{kebabCase app}}/src/features/{{kebabCase name}}"
      const actions: PlopTypes.Actions = []

      for (const file of files) {
        if (DIRECTORY_ROLES.has(file)) {
          actions.push({
            path: `${featurePath}/${file}/.gitkeep`,
            skipIfExists: true,
            templateFile: `templates/scaffolds/new-feature/${file}/.gitkeep`,
            type: "add",
          })
          continue
        }

        actions.push({
          path: `${featurePath}/${file}.ts`,
          skipIfExists: true,
          templateFile: `templates/scaffolds/new-feature/${templateFor(app, file)}`,
          type: "add",
        })
      }

      if (hasDesktopHandlers) {
        const feature = plop.renderString("{{kebabCase name}}", { name })
        const key = plop.renderString("{{camelCase name}}", { name })
        const handlers: DesktopHandlers = {
          bridgePath: DESKTOP_BRIDGE_PATH,
          contract: `${key}Contract`,
          feature,
          key,
          router: `${key}Router`,
          schemasPath: `apps/desktop/src/features/${feature}/schemas.ts`,
        }

        actions.push(
          () => addDesktopContract(handlers),
          () => serveDesktopRouter(handlers)
        )
      }

      return actions
    },
    description: "Generate a new feature with customizable file selection",
    prompts: [
      {
        choices:
          apps.length > 0
            ? apps.map((app) => ({ name: app, value: app }))
            : [{ name: "No apps found", value: "" }],
        message: "Which app would you like to add the feature to?",
        name: "app",
        type: "list",
      },
      {
        message: "What is the name of the feature?",
        name: "name",
        type: "input",
      },
      {
        choices: (answers: { app: string }) => listRoles(answers.app),
        message: "Which files would you like to include?",
        name: "files",
        type: "checkbox",
      },
    ],
  })
}
