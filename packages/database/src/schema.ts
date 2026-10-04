import type { ConstrainedString } from "@v1/utils/type"
import { createIdGenerator } from "@v1/utils/id"
import * as z from "@v1/utils/schema"
import * as pg from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations"
import { UserIdSchema } from "#schemas.ts"

const UNIQUE_ID_LENGTH = 24

export const createTable = pg.pgTableCreator((name) => name)

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

// ==========================AUTH==========================
export const authSchema = pg.pgSchema("auth")

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
})
export type Jwk = typeof jwks.$inferSelect
export type NewJwk = typeof jwks.$inferInsert

// ==========================STORAGE==========================
export const storageSchema = pg.pgSchema("storage")

export const assets = storageSchema.table(
  "assets",
  {
    ...id(z.branded("AssetId"), "asst"),
    ...timestamps,

    uploaderId: pg
      .text()
      .references(() => users.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      })
      .$type<UserId>(),

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
    pg.uniqueIndex("storage_assets_key_unique_idx").on(table.key),
    pg.index("storage_assets_owner_id_idx").on(table.ownerId),
    pg.index("storage_assets_uploader_id_idx").on(table.uploaderId),
  ]
)

export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type AssetId = Asset["id"]

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

// Relations

export const profileRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}))

export const userRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  ownedAssets: many(assets, { relationName: "assetOwner" }),
  profile: one(profiles),
  sessions: many(sessions),
  uploadedAssets: many(assets, { relationName: "assetUploader" }),
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

export const assetRelations = relations(assets, ({ one }) => ({
  owner: one(users, {
    fields: [assets.ownerId],
    references: [users.id],
    relationName: "assetOwner",
  }),
  uploader: one(users, {
    fields: [assets.uploaderId],
    references: [users.id],
    relationName: "assetUploader",
  }),
}))
