// oxlint-disable no-console - We use console.log for logging in scripts

import { checkIsLocalDatabase, createDatabase } from "@v1/database/client"
import * as schema from "@v1/database/schema"
import { is } from "drizzle-orm"
import { PgTable } from "drizzle-orm/pg-core"
import { reset, seed } from "drizzle-seed"
import { ENV } from "#env.generated.ts"

type Tables = {
  [
    Name in keyof typeof schema as (typeof schema)[Name] extends PgTable ? Name : never
  ]: (typeof schema)[Name]
}

// The filter keeps exactly the schema exports that are PgTable instances, so checking the values confirms the shape.
function assertTables(value: Record<string, unknown>): asserts value is Tables {
  if (!Object.values(value).every((table) => is(table, PgTable))) {
    throw new Error("Expected only Drizzle tables.")
  }
}

const database = createDatabase({ url: ENV.DATABASE_URL })

// drizzle-seed treats inverse `one()` relations as foreign keys, so it receives only tables.
const tables = Object.fromEntries(Object.entries(schema).filter(([, value]) => is(value, PgTable)))
assertTables(tables)

async function main() {
  console.log("\n🌱 Database Seed\n")

  if (!checkIsLocalDatabase(ENV.DATABASE_URL)) {
    throw new Error(
      "Cannot seed a non-local database. This script only works with local databases."
    )
  }

  console.log("   Removing existing data...\n")
  await reset(database, tables)
  console.log("✅ Existing data removed\n")

  console.log("   Seeding database...\n")

  const start = performance.now()

  await seed(database, tables).refine((f) => ({
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
