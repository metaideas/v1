// oxlint-disable no-console -- this script reports its progress to the terminal

import { checkIsLocalDatabase, createDatabase } from "@v1/database/client"
import * as schema from "@v1/database/schema"
import { reset } from "drizzle-seed"
import { ENV } from "#env.generated.ts"

const database = createDatabase({ url: ENV.DATABASE_URL })

async function main() {
  console.log("\n🔄 Database Reset\n")

  if (!checkIsLocalDatabase(ENV.DATABASE_URL)) {
    throw new Error(
      "Cannot reset a non-local database. This script only works with local databases."
    )
  }

  console.log("   Resetting database...\n")

  await reset(database, schema)

  console.log("✅ All data removed successfully. Database reset complete!\n")
}

void main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(`\n✖  ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
