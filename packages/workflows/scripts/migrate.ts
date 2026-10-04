// oxlint-disable no-console - We use console.log for logging in scripts

import { getDrizzlePostgresWorkflowStoreMigrationSql } from "@tanstack/workflow-store-drizzle-postgres"
import { SQL } from "bun"
import { ENV } from "#env.generated.ts"

async function main() {
  console.log("\n🔄 Workflows Migrate\n")

  const sql = new SQL(ENV.DATABASE_URL)
  await sql.unsafe(getDrizzlePostgresWorkflowStoreMigrationSql())
  await sql.close()

  console.log("✅ Workflow tables are up to date.\n")
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n✖  ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
