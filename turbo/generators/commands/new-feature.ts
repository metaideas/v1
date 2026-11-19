import type { PlopTypes } from "@turbo/gen"
import { existsSync, globSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"

import { type FeatureRole, FOLDER_ROLES, readWorkspace } from "@tooling/linting/workspace"

import { addImports } from "../imports"
import { NewFeatureAnswersSchema } from "../schemas"

const DESKTOP_ROUTERS = /mergeRouters\((?<routers>[^)]*)\)/

const ROLE_PROMPTS: Readonly<Record<FeatureRole, { isChecked?: boolean; name: string }>> = {
  assets: { name: "assets/ - Static files the components import" },
  components: { isChecked: true, name: "components/ - UI components" },
  constants: { name: "constants.ts - Static values and content" },
  data: { name: "data.ts - Query and mutation options, or content queries" },
  errors: { name: "errors.ts - Errors that stay inside the app" },
  handlers: { name: "handlers.ts - Server entry points, or main-process handlers in desktop" },
  hooks: { name: "hooks.ts - React hooks for local and derived state" },
  middleware: { name: "middleware.ts - Middleware that the feature's routes use" },
  schemas: { isChecked: true, name: "schemas.ts - Schemas for forms and local models" },
}

// Each application workspace lists its feature roles, and the shape of its handlers, in the
// `workspace` field of its package.json.
function readFeatures(app: string) {
  return readWorkspace(`apps/${app}`).features
}

function listRoles(app: string) {
  const { handlers, roles } = readFeatures(app)

  return roles
    .filter((role) => role !== "handlers" || handlers !== undefined)
    .map((role) => ({
      checked: ROLE_PROMPTS[role].isChecked ?? false,
      name: ROLE_PROMPTS[role].name,
      value: role,
    }))
}

function templateFor(app: string, file: string) {
  if (file !== "handlers") return `${file}.ts.hbs`

  const { handlers } = readFeatures(app)
  if (handlers === undefined) {
    throw new Error(`apps/${app} declares no workspace.features.handlers in its package.json.`)
  }

  return `handlers/${handlers}.ts.hbs`
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
  return (
    existsSync(schemasPath)
    && new RegExp(`export const ${contract}\\b`).test(await readFile(schemasPath, "utf8"))
  )
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

  const source = existsSync(schemasPath) ? await readFile(schemasPath, "utf8") : ""
  const declaration = `export const ${contract} = defineContract({\n  ${key}: {\n    ping: channel({ input: z.void(), output: z.string() }),\n  },\n})\n`
  const updated = addImports([source.trimEnd(), declaration].filter(Boolean).join("\n\n"), [
    { from: "@sanely/rpc", imported: "channel" },
    { from: "@sanely/rpc", imported: "defineContract" },
    { from: "zod", imported: "*", local: "z" },
  ])

  if (updated === undefined) {
    return `[MANUAL] ${schemasPath} already binds a name the contract needs. Declare ${contract} with @sanely/rpc's defineContract.`
  }

  await writeFile(schemasPath, updated)
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

  if (!existsSync(bridgePath)) {
    return `[MANUAL] ${bridgePath} is missing. ${manual}`
  }

  const source = await readFile(bridgePath, "utf8")

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

  await writeFile(bridgePath, updated)
  return `${bridgePath}: served ${router}`
}

export function registerNewFeatureGenerator(plop: PlopTypes.NodePlopAPI) {
  const apps = [...globSync("*/package.json", { cwd: `${process.cwd()}/apps` })]
    .map((entry) => entry.split("/")[0])
    .filter((app): app is string => app !== undefined && readFeatures(app).roles.length > 0)
    .toSorted()

  plop.setGenerator("new-feature", {
    actions: (rawAnswers) => {
      const {
        app,
        files: selectedFiles,
        name,
      } = Object.assign(rawAnswers ?? {}, NewFeatureAnswersSchema.parse(rawAnswers))
      const hasDesktopHandlers =
        readFeatures(app).handlers === "desktop" && selectedFiles.includes("handlers")
      const files =
        hasDesktopHandlers && !selectedFiles.includes("schemas")
          ? [...selectedFiles, "schemas"]
          : selectedFiles
      const featurePath = "apps/{{kebabCase app}}/src/features/{{kebabCase name}}"
      const actions: PlopTypes.Actions = []

      for (const file of files) {
        if (FOLDER_ROLES.has(file)) {
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
          bridgePath: `apps/${app}/src/shell/bridge.ts`,
          contract: `${key}Contract`,
          feature,
          key,
          router: `${key}Router`,
          schemasPath: `apps/${app}/src/features/${feature}/schemas.ts`,
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
