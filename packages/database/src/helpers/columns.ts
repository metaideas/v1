import type * as z from "@v1/utils/schema"
import type { ConstrainedString } from "@v1/utils/type"
import { createIdGenerator } from "@v1/utils/id"
import * as pg from "drizzle-orm/pg-core"

const UNIQUE_ID_LENGTH = 24

export function id<Schema extends z.ZodType<string>, P extends string>(
  IdSchema: Schema,
  prefix: ConstrainedString<P, 4>
) {
  const generateId = createIdGenerator({ prefix, size: UNIQUE_ID_LENGTH })

  return {
    id: pg
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId())
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
