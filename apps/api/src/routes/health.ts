import { sql } from "@v1/database/helpers/sql"
import { factory } from "#shared/utils.ts"

// Load balancers and orchestrators probe from private addresses that share one rate limit count
// across every instance, so this route has no rate limit.
export default factory.createApp().get("/", async (context) => {
  await context.var.db.execute(sql`SELECT 1`)

  return context.text("ok")
})
