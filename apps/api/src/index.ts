import "#shared/logger.ts"
import type { Serve } from "bun"

import app from "#routes/index.ts"
import { ENV } from "#shared/env.generated.ts"
import { database, dispatcher, kv } from "#shared/services.ts"

async function shutdown() {
  await dispatcher.close()
  await kv.dispose()
  await database.$client.close()
  process.exit(0)
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown()
  })
}

export default {
  fetch: app.fetch,
  port: ENV.PORT,
} satisfies Serve.Options<unknown>
