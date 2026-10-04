import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import { NewFeatureAnswersSchema } from "../schemas"

const FRONTEND_APPS: readonly string[] = ["app", "desktop", "extension", "mobile", "web"]
const REACT_APPS: readonly string[] = ["app", "desktop", "extension", "mobile"]
const SERVER_APPS: readonly string[] = ["api", "app", "worker"]
const APPS_WITHOUT_FEATURES = new Set(["docs"])
const KNOWN_APPS = new Set([...APPS_WITHOUT_FEATURES, ...FRONTEND_APPS, ...SERVER_APPS])
const DIRECTORY_ROLES = new Set(["assets", "components"])

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
  { apps: SERVER_APPS, name: "handlers.ts - Server entry points", value: "handlers" },
  { apps: REACT_APPS, name: "hooks.ts - React hooks for local and derived state", value: "hooks" },
  { isChecked: true, name: "schemas.ts - Schemas for forms and local models", value: "schemas" },
]

function listRoles(app: string) {
  const isKnownApp = KNOWN_APPS.has(app)

  return FEATURE_ROLES.filter(
    (role) =>
      role.apps === undefined
      || role.apps.includes(app)
      || (!isKnownApp && role.apps !== SERVER_APPS)
  ).map((role) => ({ checked: role.isChecked ?? false, name: role.name, value: role.value }))
}

function templateFor(app: string, file: string) {
  if (file === "handlers") {
    return `handlers/${app === "api" || app === "worker" ? app : "app"}.ts.hbs`
  }

  return `${file}.ts.hbs`
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
      const { app, files: selectedFiles } = Object.assign(
        rawAnswers ?? {},
        NewFeatureAnswersSchema.parse(rawAnswers)
      )
      const featurePath = "apps/{{kebabCase app}}/src/features/{{kebabCase name}}"
      const actions: PlopTypes.Actions = []

      for (const file of selectedFiles) {
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
