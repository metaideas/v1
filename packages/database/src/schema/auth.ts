import * as z from "@v1/utils/schema"
import * as pg from "drizzle-orm/pg-core"
import { id, timestamps } from "#helpers/columns.ts"
import { UserIdSchema } from "#schemas.ts"

export const authSchema = pg.snakeCase.schema("auth")

export const users = authSchema.table(
  "users",
  {
    ...id(UserIdSchema, "user"),
    ...timestamps,

    email: pg.text().notNull().unique(),
    emailVerified: pg.boolean().notNull().default(false),

    image: pg.text(),

    metadata: pg.jsonb(),

    name: pg.text().notNull(),
  },
  (table) => [pg.index("users_email_idx").on(table.email)]
)

export type User = typeof users.$inferSelect

export type NewUser = typeof users.$inferInsert

export type UserId = User["id"]

export const accounts = authSchema.table(
  "accounts",
  {
    ...id(z.branded("AccountId"), "acct"),
    ...timestamps,

    accessToken: pg.text(),
    accessTokenExpiresAt: pg.timestamp({ withTimezone: true }),

    accountId: pg.text().notNull(),

    idToken: pg.text(),

    password: pg.text(),

    providerId: pg.text().notNull(),

    refreshToken: pg.text(),
    refreshTokenExpiresAt: pg.timestamp({ withTimezone: true }),

    scope: pg.text(),

    userId: pg
      .text()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .$type<UserId>(),
  },
  (table) => [
    pg.index("auth_accounts_user_id_idx").on(table.userId),
    pg.index("auth_accounts_provider_idx").on(table.providerId),
    pg
      .uniqueIndex("auth_accounts_provider_account_unique_idx")
      .on(table.providerId, table.accountId),
  ]
)

export type Account = typeof accounts.$inferSelect

export type NewAccount = typeof accounts.$inferInsert

export type AccountId = Account["id"]

export const verifications = authSchema.table(
  "verifications",
  {
    ...id(z.branded("VerificationId"), "verf"),
    ...timestamps,

    identifier: pg.text().notNull(),
    value: pg.text().notNull(),

    expiresAt: pg.timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    pg.index("auth_verifications_identifier_idx").on(table.identifier),
    pg.index("auth_verifications_expires_idx").on(table.expiresAt),
    pg.uniqueIndex("auth_verifications_value_unique_idx").on(table.value),
  ]
)

export type Verification = typeof verifications.$inferSelect

export type NewVerification = typeof verifications.$inferInsert

export const sessions = authSchema.table(
  "sessions",
  {
    ...id(z.branded("SessionId"), "sess"),
    ...timestamps,

    expiresAt: pg.timestamp({ withTimezone: true }).notNull(),

    token: pg.text().notNull().unique(),

    userId: pg
      .text()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .$type<UserId>(),

    ipAddress: pg.text(),
    userAgent: pg.text(),
  },
  (table) => [
    pg.index("auth_sessions_user_id_idx").on(table.userId),
    pg.index("auth_sessions_token_idx").on(table.token),
    pg.index("auth_sessions_expires_at_idx").on(table.expiresAt),
    pg.index("auth_sessions_ip_address_idx").on(table.ipAddress),
  ]
)

export type Session = typeof sessions.$inferSelect

export type NewSession = typeof sessions.$inferInsert

export const jwks = authSchema.table("jwks", {
  ...id(z.branded("JwkId"), "jwks"),

  createdAt: pg.timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: pg.timestamp({ withTimezone: true }),

  privateKey: pg.text().notNull(),
  publicKey: pg.text().notNull(),

  alg: pg.text(),
  crv: pg.text(),
})

export type Jwk = typeof jwks.$inferSelect

export type NewJwk = typeof jwks.$inferInsert
