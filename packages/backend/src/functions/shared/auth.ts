import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth"
import { createClient } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
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

/**
 * The database adapter and plugins of every Convex auth instance. The Better Auth component and
 * schema generation build auth from these alone, because they cannot read deployment environment
 * variables.
 */
export function getConvexAuthOptions(ctx: GenericCtx<DataModel>) {
  return { database: authComponent.adapter(ctx), plugins: [convex({ authConfig })] }
}

export function getTrustedOrigins() {
  return env.AUTH_TRUSTED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}
