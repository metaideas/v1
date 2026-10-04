import type { Server } from "bun"
import { lifecycle } from "@v1/utils/lifecycle"
import app from "#routes/index.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { database, dispatcher, kv } from "#shared/services.ts"

let server: Server<undefined> | undefined

await lifecycle(
  () => {
    server = Bun.serve({ fetch: app.fetch, port: ENV.PORT })
  },
  {
    // The server stops taking requests and finishes the ones in progress before the services close.
    close: async () => {
      await server?.stop()
      await Promise.all([dispatcher.close(), kv.dispose(), database.$client.close()])
    },
    logger: log,
    scope: "api",
  }
)
