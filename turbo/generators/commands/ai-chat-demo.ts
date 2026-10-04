import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import { readPackageJson, readPackageName } from "../schemas"

const APP_PATH = "apps/app"
const AI_PACKAGE_PATH = "packages/ai/package.json"
const CHAT_PLAYGROUND_PATH = `${APP_PATH}/src/features/demo/components/chat-playground.tsx`

export function registerAiChatDemoGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator("ai-chat-demo", {
    actions: () => [
      async () => {
        const [hasApp, hasAiPackage] = await Promise.all([
          Bun.file(`${APP_PATH}/package.json`).exists(),
          Bun.file(AI_PACKAGE_PATH).exists(),
        ])

        if (!hasApp) {
          throw new Error(
            "The ai-chat-demo generator requires apps/app. Restore it with `bun template add app app`."
          )
        }

        if (!hasAiPackage) {
          throw new Error(
            "The ai-chat-demo generator requires packages/ai. Restore it with `bun template add package ai`."
          )
        }

        const aiPackageName = await readPackageName(AI_PACKAGE_PATH)
        const appPackageJsonPath = `${APP_PATH}/package.json`
        const appPackageJson = await readPackageJson(appPackageJsonPath)
        const dependencies = appPackageJson.dependencies ?? {}

        if (dependencies[aiPackageName] === "workspace:*") {
          return `[SKIPPED] ${appPackageJsonPath} already contains ${aiPackageName}`
        }

        dependencies[aiPackageName] = "workspace:*"
        appPackageJson.dependencies = Object.fromEntries(
          Object.entries(dependencies).toSorted(([left], [right]) => left.localeCompare(right))
        )
        await Bun.write(appPackageJsonPath, `${JSON.stringify(appPackageJson, null, 2)}\n`)
        await Bun.$`bun install`

        return `${appPackageJsonPath}: added ${aiPackageName}`
      },
      {
        path: `${APP_PATH}/src/features/demo/data.ts`,
        skipIfExists: true,
        templateFile: "templates/ai-chat-demo/data.ts.hbs",
        type: "add",
      },
      {
        path: CHAT_PLAYGROUND_PATH,
        skipIfExists: true,
        templateFile: "templates/ai-chat-demo/chat-playground.tsx.hbs",
        type: "add",
      },
      () =>
        `Render the default export of ${CHAT_PLAYGROUND_PATH} in a route, such as apps/app/src/routes/_authenticated/index.tsx.`,
    ],
    description: "Add a scripted AI SDK chat demo to apps/app",
    prompts: [],
  })
}
