import type { GenericCtx } from "@convex-dev/better-auth"
import { createAuth } from "@v1/auth/server"
import type { DataModel } from "#functions/_generated/dataModel.js"
import { env } from "#functions/_generated/server.js"
import { authComponent, createAuthOptions, getTrustedOrigins } from "#functions/shared/auth.ts"

export { authComponent } from "#functions/shared/auth.ts"

export const { onCreate, onDelete, onUpdate } = authComponent.triggersApi()

export function convexAuth(ctx: GenericCtx<DataModel>) {
  return createAuth({
    ...createAuthOptions(ctx),
    baseURL: env.CONVEX_SITE_URL,
    secret: env.AUTH_SECRET,
    trustedOrigins: getTrustedOrigins(),
  })
}
