import { createApi } from "@convex-dev/better-auth"
import schema from "#functions/components/better-auth/schema.ts"
import { createAuthOptions } from "#functions/shared/auth.ts"

const api = createApi(schema, createAuthOptions)

export const { create, findOne, findMany } = api
export const { updateOne, updateMany, deleteOne, deleteMany } = api
