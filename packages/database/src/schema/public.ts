import * as z from "@v1/utils/schema"
import * as pg from "drizzle-orm/pg-core"
import { id, timestamps } from "#helpers/columns.ts"
import { type UserId, users } from "#schema/auth.ts"

export const createTable = pg.pgTableCreator((name) => name)

// Insert your tables here
export const documents = createTable("documents", {
  ...id(z.branded("DocumentId"), "doc"),
  ...timestamps,

  content: pg.text().notNull(),
  name: pg.text().notNull(),
})

export const profiles = createTable("profiles", {
  ...id(z.branded("ProfileId"), "prof"),
  ...timestamps,

  userId: pg
    .text()
    .notNull()
    .unique()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .$type<UserId>(),
})
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type ProfileId = Profile["id"]
