import { relations } from "drizzle-orm/relations"
import { accounts, sessions, users } from "#schema/auth.ts"
import { profiles } from "#schema/public.ts"
import { uploads } from "#schema/storage.ts"

export const profileRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}))

export const userRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  profile: one(profiles),
  sessions: many(sessions),
  uploads: many(uploads),
}))

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const uploadRelations = relations(uploads, ({ one }) => ({
  owner: one(users, {
    fields: [uploads.ownerId],
    references: [users.id],
  }),
}))
