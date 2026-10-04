import "#shared/logger.ts"
import type { Serve } from "bun"

import app from "#routes/index.ts"
import { ENV } from "#shared/env.generated.ts"
import { database, kv, workflows } from "#shared/services.ts"

workflows.launch()

async function shutdown() {
  await workflows.shutdown()
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
