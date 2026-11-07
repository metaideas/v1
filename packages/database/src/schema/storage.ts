import * as z from "@v1/utils/schema"
import * as pg from "drizzle-orm/pg-core"
import { id, timestamps } from "#helpers/columns.ts"
import { type UserId, users } from "#schema/auth.ts"

export const storageSchema = pg.snakeCase.schema("storage")

export const uploads = storageSchema.table(
  "uploads",
  {
    ...id(z.branded("UploadId"), "upld"),
    ...timestamps,

    etag: pg.text(),

    key: pg.text().notNull(),

    lastModified: pg.bigint({ mode: "number" }),

    metadata: pg.jsonb().$type<Record<string, string>>(),

    name: pg.text().notNull(),

    ownerId: pg
      .text()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .$type<UserId>(),

    size: pg.integer().notNull(),

    type: pg.text().notNull(),
  },
  (table) => [
    pg.uniqueIndex("storage_uploads_key_unique_idx").on(table.key),
    pg.index("storage_uploads_owner_id_idx").on(table.ownerId),
  ]
)

export type Upload = typeof uploads.$inferSelect
export type NewUpload = typeof uploads.$inferInsert
export type UploadId = Upload["id"]
