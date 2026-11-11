import { sql } from "@v1/database/helpers/sql"
import { withRateLimiting } from "#shared/middleware.ts"
import { factory } from "#shared/utils.ts"

export default factory
  .createApp()
  .get(
    "/",
    withRateLimiting({ limit: 60, name: "health", window: "1 minute" }),
    async (context) => {
      await context.var.db.execute(sql`SELECT 1`)

      return context.text("ok")
    }
  )
