import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import type * as z from "zod"

import { FilesClientAnswersSchema, readPackageJson } from "../schemas"

type FilesClientAnswers = PlopTypes.Answers
  & z.infer<typeof FilesClientAnswersSchema> & {
    isDependencyRequired?: boolean
    isInstalled?: boolean
  }

async function getMissingPaths(paths: readonly string[]) {
  const checks = await Promise.all(
    paths.map(async (path) => ({ exists: await Bun.file(path).exists(), path }))
  )
  return checks.filter(({ exists }) => !exists).map(({ path }) => path)
}

export function registerFilesClientGenerator(plop: PlopTypes.NodePlopAPI) {
  const apps = [
    ...new Bun.Glob("*/package.json").scanSync({
      cwd: `${process.cwd()}/apps`,
    }),
  ]
    .map((entry) => entry.split("/")[0])
    .filter((app): app is string => app !== undefined)
    .toSorted()

  plop.setGenerator("files-client", {
    actions: (rawAnswers) => {
      const answers: FilesClientAnswers = Object.assign(
        rawAnswers ?? {},
        FilesClientAnswersSchema.parse(rawAnswers)
      )
      const appPath = `apps/${answers.app}`
      const clientPath = `${appPath}/src/shared/files.ts`
      const actions: PlopTypes.Actions = [
        async () => {
          const requiredPaths = [
            "apps/api/src/shared/files.ts",
            "apps/api/src/routes/files.ts",
            `${appPath}/package.json`,
          ]
          const missingPaths = await getMissingPaths(requiredPaths)
          if (missingPaths.length > 0)
            throw new Error(
              `The files-client generator requires the /files server from apps/api and the selected app workspace. Restore the API with \`bun template add app api\`. Missing: ${missingPaths.join(", ")}`
            )

          const [routes, packageJson, hasClient] = await Promise.all([
            Bun.file("apps/api/src/routes/index.ts").text(),
            readPackageJson(`${appPath}/package.json`),
            Bun.file(clientPath).exists(),
          ])
          if (!routes.includes('.route("/files", filesRoutes)'))
            throw new Error(
              "The files-client generator requires the Files SDK server mounted at /files in apps/api."
            )

          const installedPackages = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          }
          answers.isDependencyRequired = !("files-sdk" in installedPackages)
          answers.isInstalled = hasClient && !answers.isDependencyRequired

          return answers.isInstalled
            ? `Prepared the existing Files SDK client in ${appPath}`
            : `Prepared the Files SDK React client in ${appPath}`
        },
        async () => {
          if (!answers.isDependencyRequired)
            return `[SKIPPED] ${appPath} already contains files-sdk`

          await Bun.$`cd ${appPath} && bun add --exact files-sdk`
          return `${appPath}: installed files-sdk`
        },
        {
          path: clientPath,
          skipIfExists: true,
          templateFile: "templates/files/files-client/react.ts.hbs",
          type: "add",
        },
      ]

      return actions
    },
    description: "Generate a Files SDK client",
    prompts: [
      {
        choices:
          apps.length > 0
            ? apps.map((app) => ({ name: app, value: app }))
            : [{ name: "No supported client apps found", value: "" }],
        message: "Which app should receive the Files SDK client?",
        name: "app",
        type: "list",
      },
      {
        default: "http://localhost:3000/files",
        message: "What is the Files SDK endpoint?",
        name: "endpoint",
        type: "input",
      },
    ],
  })
}
