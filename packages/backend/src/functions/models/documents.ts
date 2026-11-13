import { UnauthenticatedError } from "@v1/core/domains/auth"
import { v } from "convex/values"
import { protectedQuery, publicQuery } from "#functions/shared/convex.ts"

export const getDocument = publicQuery
  .input({ name: v.string() })
  .handler(async (ctx, { name }) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique()

    return document
  })

export const withDocument = protectedQuery.createMiddleware(async (ctx, next) => {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new UnauthenticatedError()
  }

  const document = await ctx.db
    .query("documents")
    .withIndex("by_name", (q) => q.eq("name", identity.subject))
    .unique()

  return next({ ...ctx, document })
})
