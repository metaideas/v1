// oxlint-disable no-console - We use console.log for logging in scripts

import { defaultDrizzlePostgresWorkflowStoreTables } from "@tanstack/workflow-store-drizzle-postgres"
import { SQL } from "bun"
import { ENV } from "#env.generated.ts"

async function main() {
  console.log("\n🔄 Workflows Reset\n")

  if (!(ENV.DATABASE_URL.includes("localhost") || ENV.DATABASE_URL.includes("127.0.0.1"))) {
    throw new Error(
      "Cannot reset a non-local database. This script only works with local databases."
    )
  }

  console.log(
    "   Removing workflow state. Stop the API first, then run migrate to recreate the tables.\n"
  )

  const sql = new SQL(ENV.DATABASE_URL)
  const tables = Object.values(defaultDrizzlePostgresWorkflowStoreTables)
  await sql.unsafe(`DROP TABLE IF EXISTS ${tables.map((table) => `"${table}"`).join(", ")} CASCADE`)
  await sql.close()

  console.log("✅ Workflow runs, timers, schedules, and history removed.\n")
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n✖  ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
