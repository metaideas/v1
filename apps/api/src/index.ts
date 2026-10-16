import type { Server } from "bun"
import { lifecycle } from "@v1/utils/lifecycle"
import app from "#routes/index.ts"
import { realtimeHandler } from "#routes/realtime.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { database, dispatcher, kv, realtime } from "#shared/services.ts"

let server: Server<undefined> | undefined

await lifecycle(
  () => {
    server = Bun.serve({ fetch: app.fetch, port: ENV.PORT })
  },
  {
    // The server stops taking requests and finishes the ones in progress before the services close.
    // Realtime streams never finish on their own, so they end once the server stops taking requests.
    close: async () => {
      const stopped = server?.stop()
      realtimeHandler.close()
      await stopped
      await Promise.all([
        dispatcher.close(),
        kv.dispose(),
        realtime.close(),
        database.$client.close(),
      ])
    },
    onError: (error, message) => {
      log.error({ error, message, scope: "api" })
    },
  }
)
