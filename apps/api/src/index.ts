import { once } from "node:events"
import { createServer } from "node:http"
import { getRequestListener } from "@hono/node-server"
import { lifecycle } from "@v1/utils/lifecycle"
import app from "#routes/index.ts"
import { realtimeHandler } from "#routes/realtime.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { database, dispatcher, kv, realtime, redis } from "#shared/services.ts"

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
async function close() {
  const stopped = server.listening && once(server.close(), "close")
  realtimeHandler.close()
  await stopped

  // A reconnecting Redis client may never answer the commands that `close()` waits for, so it is
  // destroyed instead. A client that is not open throws on both.
  if (redis.isOpen && !redis.isReady) redis.destroy()
  await Promise.all([
    dispatcher.close(),
    kv.dispose(),
    realtime.close(),
    redis.isReady && redis.close(),
    database.$client.end(),
  ])
}

await lifecycle(
  async () => {
    server.listen(ENV.PORT)
    await once(server, "listening")
  },
  {
    close,
    onError: (error, message) => {
      log.error({ error, message, scope: "api" })
    },
  }
)
