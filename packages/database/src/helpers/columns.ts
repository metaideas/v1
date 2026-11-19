import type * as z from "@v1/utils/schema"
import type { ConstrainedString } from "@v1/utils/type"
import * as pg from "drizzle-orm/pg-core"
import { customAlphabet } from "nanoid"

const NO_LOOKALIKE_ALPHABET = "346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz"

const UNIQUE_ID_LENGTH = 24

const nanoid = customAlphabet(NO_LOOKALIKE_ALPHABET, UNIQUE_ID_LENGTH)

export function id<Schema extends z.ZodType<string>, P extends string>(
  IdSchema: Schema,
  prefix: ConstrainedString<P, 4>
) {
  return {
    id: pg
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => `${prefix}_${nanoid()}`)
      .$type<z.infer<typeof IdSchema>>(),
  }
}

export const timestamps = {
  createdAt: pg.timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: pg
    .timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
}
