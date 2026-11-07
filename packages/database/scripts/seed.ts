// oxlint-disable no-console - We use console.log for logging in scripts

import { checkIsLocalDatabase, createDatabase } from "@v1/database/client"
import * as schema from "@v1/database/schema"
import { reset, seed } from "drizzle-seed"
import { ENV } from "#env.generated.ts"

const database = createDatabase({ url: ENV.DATABASE_URL })

async function main() {
  console.log("\n🌱 Database Seed\n")

  if (!checkIsLocalDatabase(ENV.DATABASE_URL)) {
    throw new Error(
      "Cannot seed a non-local database. This script only works with local databases."
    )
  }

  console.log("   Removing existing data...\n")
  await reset(database, schema)
  console.log("✅ Existing data removed\n")

  console.log("   Seeding database...\n")

  const start = performance.now()

  await seed(database, schema).refine((f) => ({
    users: {
      columns: {
        name: f.fullName(),
      },

      count: 10,
      with: {
        accounts: 1,
        profiles: 1,
      },
    },
    verifications: {
      columns: {
        id: f.intPrimaryKey(),
      },
    },
  }))

  const end = performance.now()

  console.log(`✅ Database seeded successfully in ${Math.round(end - start)}ms\n`)
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n✖  ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
