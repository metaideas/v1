import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth"
import type { AuthOptions } from "@v1/auth/server"
import { createClient } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import {
  AUTH_ADVANCED_OPTIONS,
  AUTH_APP_NAME,
  AUTH_EMAIL_AND_PASSWORD_OPTIONS,
  AUTH_SESSION_OPTIONS,
} from "@v1/auth/constants"
import type { DataModel } from "#functions/_generated/dataModel.js"
import { components, internal } from "#functions/_generated/api.js"
import { env } from "#functions/_generated/server.js"
import authConfig from "#functions/auth.config.ts"
import authSchema from "#functions/components/better-auth/schema.ts"

const authFunctions: AuthFunctions = internal.auth

export const authComponent = createClient<DataModel, typeof authSchema>(components.auth, {
  authFunctions,
  local: { schema: authSchema },
})

export function createAuthOptions(ctx: GenericCtx<DataModel>) {
  return {
    advanced: AUTH_ADVANCED_OPTIONS,
    appName: AUTH_APP_NAME,
    database: authComponent.adapter(ctx),
    emailAndPassword: AUTH_EMAIL_AND_PASSWORD_OPTIONS,
    plugins: [convex({ authConfig })],
    session: AUTH_SESSION_OPTIONS,
  } satisfies AuthOptions
}

export function getTrustedOrigins() {
  return env.AUTH_TRUSTED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}
