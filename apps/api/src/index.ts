import { once } from "node:events"
import { createServer } from "node:http"
import { getRequestListener } from "@hono/node-server"
import { lifecycle } from "@v1/utils/lifecycle"
import app from "#routes/index.ts"
import { realtimeHandler } from "#routes/realtime.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { close } from "#shared/services.ts"

const handleRequest = getRequestListener(app.fetch)

const server = createServer((request, response) => {
  void handleRequest(request, response)
})

// A keep-alive connection stays open after its last response until it times out, which holds
// `close` open, so once the server stops taking requests each connection closes as it goes idle.
server.on("request", (_request, response) => {
  response.on("close", () => {
    if (!server.listening) {
      server.closeIdleConnections()
    }
  })
})

// The server stops taking requests and finishes the ones in progress before the services close.
// Realtime streams never finish on their own, so they end once the server stops taking requests.
async function shutdown() {
  const stopped = server.listening && once(server.close(), "close")
  realtimeHandler.close()
  await stopped
  await close()
}

await lifecycle(
  async () => {
    server.listen(ENV.PORT)
    await once(server, "listening")
  },
  {
    close: shutdown,
    onError: (error, message) => {
      log.error({ error, message, scope: "api" })
    },
  }
)
