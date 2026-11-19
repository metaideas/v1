// Keep the anchors from apps/api in fixtures the recipes cannot modify.
export const API_ENTRYPOINT = `import { lifecycle } from "@v1/utils/lifecycle"
import { close } from "#shared/services.ts"

async function shutdown() {
  await close()
}

await lifecycle(async () => {}, { close: shutdown })
`

export const API_ROUTES = `import { factory } from "#shared/utils.ts"

const app = factory.createApp()

app.on(["POST", "GET"], "/auth/**", (c) => c.var.auth.handler(c.req.raw))

export default app
`

export const API_SHUTDOWN_BODY = /^async function shutdown\(\) \{\n(?<body>[\s\S]*?)\n\}$/m
