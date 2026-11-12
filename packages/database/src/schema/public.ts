import * as z from "@v1/utils/schema"
import * as pg from "drizzle-orm/pg-core"
import { id, timestamps } from "#helpers/columns.ts"
import { type UserId, users } from "#schema/auth.ts"

// Insert your tables here
export const documents = pg.snakeCase.table("documents", {
  ...id(z.branded("DocumentId"), "doc"),
  ...timestamps,

  content: pg.text().notNull(),
  name: pg.text().notNull(),
})

export const profiles = pg.snakeCase.table("profiles", {
  ...id(z.branded("ProfileId"), "prof"),
  ...timestamps,

  userId: pg
    .text()
    .notNull()
    // Drizzle 0.x named the constraint after the property, and keeping the name avoids a migration.
    .unique("profiles_userId_unique")
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .$type<UserId>(),
})

export type Profile = typeof profiles.$inferSelect

export type NewProfile = typeof profiles.$inferInsert

export type ProfileId = Profile["id"]
