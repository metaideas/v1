import { defineRelations } from "drizzle-orm"
import * as schema from "#schema/index.ts"

export const relations = defineRelations(schema, (r) => ({
  accounts: {
    user: r.one.users({ from: r.accounts.userId, optional: false, to: r.users.id }),
  },
  profiles: {
    user: r.one.users({ from: r.profiles.userId, optional: false, to: r.users.id }),
  },
  sessions: {
    user: r.one.users({ from: r.sessions.userId, optional: false, to: r.users.id }),
  },
  uploads: {
    owner: r.one.users({ from: r.uploads.ownerId, optional: false, to: r.users.id }),
  },
  users: {
    accounts: r.many.accounts(),
    profile: r.one.profiles({ from: r.users.id, to: r.profiles.userId }),
    sessions: r.many.sessions(),
    uploads: r.many.uploads(),
  },
}))
