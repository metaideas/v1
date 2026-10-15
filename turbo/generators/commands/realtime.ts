import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import type * as z from "zod"

import { RealtimeAnswersSchema, readPackageJson, readPackageName } from "../schemas"

type RealtimeApp = z.infer<typeof RealtimeAnswersSchema>["app"]

type RealtimeSetup = {
  /**
   * Checks that the app reaches `apps/api` with a session, and returns the step that fixes it when
   * it does not.
   */
  check: (appPath: string) => Promise<string | undefined>
  templateFile: string
}

const REALTIME_APPS = RealtimeAnswersSchema.shape.app.options
const REALTIME_PATH = "packages/realtime"
const ROUTE_PATH = "apps/api/src/routes/realtime.ts"

async function hasExport(path: string, name: string) {
  const file = Bun.file(path)
  return (
    (await file.exists())
    && new RegExp(`^export (?:const|function) ${name}\\b`, "m").test(await file.text())
  )
}

const SETUPS: Record<RealtimeApp, RealtimeSetup> = {
  app: {
    check: async (appPath) => {
      const environment = Bun.file(`${appPath}/.env.development`)
      const isRemote =
        (await environment.exists()) && /^PUBLIC_API_URL=\S+/m.test(await environment.text())

      if (isRemote && (await hasExport(`${appPath}/src/shared/auth.ts`, "authClient"))) return

      return "Realtime streams from apps/api, and apps/app signs in against its own backend until PUBLIC_API_URL points at the API. Connect apps/app to apps/api with the connect-backend skill first."
    },
    templateFile: "templates/realtime/app-realtime.ts.hbs",
  },
  mobile: {
    check: async (appPath) => {
      const isConnected =
        (await hasExport(`${appPath}/src/shared/auth.ts`, "auth"))
        && (await hasExport(`${appPath}/src/shared/utils.ts`, "buildApiUrl"))

      if (isConnected) return

      return "Realtime streams from apps/api and needs a session. Connect apps/mobile to apps/api with auth (hono with auth) using the connect-backend skill first."
    },
    templateFile: "templates/realtime/mobile-realtime.ts.hbs",
  },
}

export function registerRealtimeGenerator(plop: PlopTypes.NodePlopAPI) {
  const apps = [
    ...new Bun.Glob("*/package.json").scanSync({
      cwd: `${process.cwd()}/apps`,
    }),
  ]
    .map((entry) => entry.split("/")[0])
    .filter((app): app is RealtimeApp => REALTIME_APPS.some((realtimeApp) => realtimeApp === app))
    .toSorted()

  plop.setGenerator("realtime", {
    actions: (rawAnswers) => {
      const { app } = RealtimeAnswersSchema.parse(rawAnswers)
      const appPath = `apps/${app}`
      const setup = SETUPS[app]

      return [
        async () => {
          if (!(await Bun.file(`${REALTIME_PATH}/package.json`).exists())) {
            throw new Error(
              `The realtime client needs ${REALTIME_PATH}. Add it with bun template add.`
            )
          }

          if (!(await Bun.file(ROUTE_PATH).exists())) {
            throw new Error(`The realtime client streams from ${ROUTE_PATH}, which is missing.`)
          }

          const problem = await setup.check(appPath)
          if (problem) throw new Error(problem)

          const name = await readPackageName(`${REALTIME_PATH}/package.json`)
          const packageJson = await readPackageJson(`${appPath}/package.json`)

          if (name in { ...packageJson.dependencies, ...packageJson.devDependencies }) {
            return `[SKIPPED] ${appPath} already depends on ${name}`
          }

          const dependency = `${name}@workspace:*`
          await Bun.$`cd ${appPath} && bun add ${dependency}`
          return `${appPath}: added ${name}`
        },
        {
          path: `${appPath}/src/shared/realtime.ts`,
          skipIfExists: true,
          templateFile: setup.templateFile,
          type: "add",
        },
        () =>
          "Subscribe with `useRealtime` from #shared/realtime.ts, passing `enabled` only once a session loads. `POST /v1/demo/realtime` on the API sends a `greeted` event to the signed-in user's `demo` channel.",
        () => "Run `bun run fix`, then `bun template doctor`.",
      ]
    },
    description: "Add the realtime client to an application workspace",
    prompts: [
      {
        choices:
          apps.length > 0
            ? apps.map((app) => ({ name: app, value: app }))
            : [{ name: "No supported apps found (app, mobile)", value: "" }],
        message: "Which app should subscribe to realtime channels?",
        name: "app",
        type: "list",
      },
    ],
  })
}
