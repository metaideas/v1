import { createApi, type GenericCtx } from "@convex-dev/better-auth"
import { createAuthOptions } from "@v1/auth/server"
import type { DataModel } from "#functions/_generated/dataModel.js"
import schema from "#functions/components/better-auth/schema.ts"
import { getConvexAuthOptions } from "#functions/shared/auth.ts"

const api = createApi(schema, (ctx: GenericCtx<DataModel>) =>
  createAuthOptions(getConvexAuthOptions(ctx))
)

export const { create, findOne, findMany } = api
export const { consumeOne, incrementOne } = api
export const { updateOne, updateMany, deleteOne, deleteMany } = api
