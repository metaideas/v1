import { UnauthenticatedError } from "@v1/core/errors"
import { createBuilder } from "fluent-convex"
import type { DataModel } from "#functions/_generated/dataModel.js"
import type { ActionCtx, MutationCtx, QueryCtx } from "#functions/_generated/server.js"
import { authComponent } from "#functions/shared/auth.ts"

export type GenericCtx = QueryCtx | ActionCtx | MutationCtx

export const convex = createBuilder<DataModel>()

export const withAuthentication = convex
  .$context<GenericCtx>()
  .createMiddleware(async (ctx, next) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new UnauthenticatedError()
    }

    const authUser = await authComponent.getAuthUser(ctx)

    return next({ ...ctx, authUser, identity })
  })

export const publicQuery = convex.query()
export const publicMutation = convex.mutation()
export const publicAction = convex.action()

export const protectedQuery = convex.query().use(withAuthentication)
export const protectedMutation = convex.mutation().use(withAuthentication)
export const protectedAction = convex.action().use(withAuthentication)

export const internalQuery = convex.query()
export const internalMutation = convex.mutation()
export const internalAction = convex.action()
