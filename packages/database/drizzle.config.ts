import { checkIsLocalDatabase } from "@v1/database/client"
import { defineConfig } from "drizzle-kit"
import { is } from "drizzle-orm"
import { PgSchema } from "drizzle-orm/pg-core"
import { ENV } from "#env.generated.ts"
import * as schema from "#schema/index.ts"

if (!(checkIsLocalDatabase(ENV.DATABASE_URL) || ENV.RUN_PRODUCTION_MIGRATIONS)) {
  throw new Error(
    "DATABASE_URL is not allowed to be a remote URL when RUN_PRODUCTION_MIGRATIONS is not true"
  )
}

const schemaNames = Object.values(schema)
  .filter((value) => is(value, PgSchema))
  .map((value) => value.schemaName)

export default defineConfig({
  breakpoints: true,
  dbCredentials: {
    url: ENV.DATABASE_URL,
  },
  dialect: "postgresql",
  out: "./migrations",
  schema: ["./src/schema/index.ts", "./src/relations.ts"],
  schemaFilter: ["public", ...schemaNames],
  verbose: true,
})
