import type { PlopTypes } from "@turbo/gen"
import { existsSync } from "node:fs"
import type * as z from "zod"

import { ConnectBackendAnswersSchema, readPackageName } from "../schemas"

type Answers = z.infer<typeof ConnectBackendAnswersSchema>
type App = Answers["app"]
type Backend = Answers["backend"]
type AuthSupport = "optional" | "required" | "unsupported"

// The connections the templates cover, and whether each can add sign-in. A missing entry is
// unsupported. `app` signs in with its existing auth client, so its auth adds no files.
const CONNECTIONS: Readonly<Record<App, Partial<Record<Backend, AuthSupport>>>> = {
  app: { convex: "unsupported", hono: "optional", trpc: "optional" },
  desktop: { convex: "unsupported", hono: "optional", trpc: "optional" },
  extension: { hono: "optional", trpc: "optional" },
  mobile: { convex: "required", hono: "optional" },
}

const ROUTES: Readonly<Record<App, string | undefined>> = {
  app: "routes",
  desktop: "renderer/routes",
  extension: undefined,
  mobile: "app",
}

// The workspaces whose package names fill the templates' placeholders.
const PACKAGES = {
  apiPackage: "apps/api",
  authPackage: "packages/auth",
  backendPackage: "packages/backend",
  uiPackage: "packages/ui",
  utilsPackage: "packages/utils",
} as const

type File = readonly [template: string, target: string]

// The API client for each app. Mobile with sign-in sends the session as headers.
const HONO_CLIENTS: Readonly<Record<App, (auth: boolean) => string>> = {
  app: () => "hono/api.ts",
  desktop: () => "hono/desktop/api.ts",
  extension: () => "hono/extension/api.ts",
  mobile: (auth) => (auth ? "hono/mobile/api.ts" : "hono/mobile/public-api.ts"),
}

// `buildApiUrl` for the API client. `apps/app` already has it in `shared/utils.ts`, and mobile's
// `shared/utils.ts` holds other helpers, so mobile takes its own file.
function listUrlFiles(app: App): File[] {
  switch (app) {
    case "app":
      return []
    case "desktop":
    case "extension":
      return [[`hono/${app}/utils.ts`, "shared/utils.ts"]]
    case "mobile":
      return [["hono/mobile/api-url.ts", "shared/api-url.ts"]]
  }
}

function listClientFiles({ app, auth, backend }: Answers): File[] {
  switch (backend) {
    case "hono":
      return [[HONO_CLIENTS[app](auth), "shared/api.ts"], ...listUrlFiles(app)]
    case "trpc":
      return [[`trpc/${app}/trpc.tsx`, "shared/trpc.tsx"], ...listUrlFiles(app)]
    case "convex":
      return [
        [`convex/${app}/convex-provider.tsx`, "shared/components/convex-provider.tsx"],
        ...(app === "mobile" ? [["convex/mobile/auth.ts", "shared/auth.ts"] as const] : []),
        ...(app === "app" ? [["convex/app/convex.ts", "shared/convex.ts"] as const] : []),
      ]
  }
}

function listProxyFiles({ app, backend }: Answers): File[] {
  return app === "desktop" && backend !== "convex"
    ? [
        ["shared/desktop/api-proxy.ts", "shared/api-proxy.ts"],
        ["shared/desktop/shell-api-proxy.ts", "shared/shell/api-proxy.ts"],
      ]
    : []
}

function listAuthFiles({ app, auth, backend }: Answers): File[] {
  if (!auth) return []

  switch (app) {
    case "app":
      return []
    case "desktop":
      return [
        ["shared/desktop-auth/auth.ts", "shared/auth.ts"],
        ["shared/desktop-auth/shell-auth.ts", "shared/shell/auth.ts"],
        ...(["errors", "handlers", "data", "hooks"] as const).map((role): File => [
          `shared/desktop-auth/${role}.ts`,
          `features/auth/${role}.ts`,
        ]),
        ["shared/desktop-auth/sign-in-form.tsx", "features/auth/components/sign-in-form.tsx"],
        ["shared/desktop-auth/account-panel.tsx", "features/auth/components/account-panel.tsx"],
        ["shared/desktop-auth/account.tsx", "renderer/routes/account.tsx"],
      ]
    case "extension":
      return [
        ["shared/extension-auth/auth.ts", "shared/auth.ts"],
        ["shared/extension-auth/schemas.ts", "features/auth/schemas.ts"],
        ["shared/extension-auth/hooks.ts", "features/auth/hooks.ts"],
        ["shared/extension-auth/account-panel.tsx", "features/auth/components/account-panel.tsx"],
      ]
    case "mobile":
      return [
        ...(backend === "hono" ? [["hono/mobile/auth.ts", "shared/auth.ts"] as const] : []),
        ["shared/mobile-auth/_layout.tsx", "app/(auth)/_layout.tsx"],
        ["shared/mobile-auth/sign-in.tsx", "app/(auth)/(unauthenticated)/sign-in.tsx"],
        ["shared/mobile-auth/use-email-sign-in.ts", "shared/use-email-sign-in.ts"],
        ["shared/mobile-auth/index.tsx", "app/(auth)/(authenticated)/index.tsx"],
      ]
  }
}

function listExampleFiles({ app, auth, backend, example }: Answers): File[] {
  const routes = ROUTES[app]
  if (!example || routes === undefined) return []

  const directory = app === "mobile" && auth ? `${routes}/(auth)/(authenticated)` : routes
  const name = backend === "hono" ? "backend" : backend

  return [[`${backend}/${app}/example.tsx`, `${directory}/${name}-example.tsx`]]
}

/**
 * Lists the files a connection adds, as template paths under `templates/connect-backend/` without
 * `.hbs`, and target paths under the app's `src/`. It throws for a connection the templates do not
 * cover.
 */
export function listConnectionFiles(answers: Answers): File[] {
  const support = CONNECTIONS[answers.app][answers.backend]

  if (support === undefined) {
    throw new Error(`apps/${answers.app} can't connect to ${answers.backend}.`)
  }
  if (answers.auth && support === "unsupported") {
    throw new Error(`apps/${answers.app} can't sign in through ${answers.backend}.`)
  }

  const connection = { ...answers, auth: answers.auth || support === "required" }

  return [
    ...listClientFiles(connection),
    ...listProxyFiles(connection),
    ...listAuthFiles(connection),
    ...listExampleFiles(connection),
  ]
}

export function registerConnectBackendGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator("connect-backend", {
    actions: (rawAnswers) => {
      const answers = ConnectBackendAnswersSchema.parse(rawAnswers)
      const files = listConnectionFiles(answers)
      const data: Record<string, string> = {}

      return [
        async () => {
          const backendPath = answers.backend === "convex" ? "packages/backend" : "apps/api"
          if (!existsSync(`${backendPath}/package.json`)) {
            throw new Error(`${backendPath} is missing. Restore it with the v1-workspace skill.`)
          }

          const names = await Promise.all(
            Object.entries(PACKAGES)
              .filter(([, path]) => existsSync(`${path}/package.json`))
              .map(async ([key, path]) => [key, await readPackageName(`${path}/package.json`)])
          )
          Object.assign(data, Object.fromEntries(names))

          return `Read the package names for apps/${answers.app}`
        },
        ...files.map(([template, target]) => ({
          data,
          path: `apps/${answers.app}/src/${target}`,
          skipIfExists: true,
          templateFile: `templates/connect-backend/${template}.hbs`,
          type: "add" as const,
        })),
        () =>
          "Finish the connection with the remaining steps in .agents/skills/v1-feature/references/backend.md.",
      ]
    },
    description: "Add the client files that connect an app to apps/api or packages/backend",
    prompts: [
      {
        choices: ["app", "desktop", "extension", "mobile"],
        message: "Which app should connect?",
        name: "app",
        type: "list",
      },
      {
        choices: ["hono", "trpc", "convex"],
        message:
          "Which backend? hono and trpc reach apps/api, and convex reaches packages/backend.",
        name: "backend",
        type: "list",
      },
      {
        default: false,
        message: "Add sign-in? Convex on mobile always signs in.",
        name: "auth",
        type: "confirm",
      },
      {
        default: false,
        message: "Add an example route that calls the backend?",
        name: "example",
        type: "confirm",
      },
    ],
  })
}
