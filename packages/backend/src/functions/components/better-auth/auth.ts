import type { GenericQueryCtx } from "convex/server"
import { createAuth } from "@v1/auth/server"
import type { DataModel } from "#functions/_generated/dataModel.js"
import { createAuthOptions } from "#functions/shared/auth.ts"

function unavailable(): never {
  throw new Error("Better Auth schema generation does not run database operations.")
}

// Static instance for Better Auth schema generation only
const schemaGenerationContext: GenericQueryCtx<DataModel> = {
  auth: { getUserIdentity: unavailable },
  db: {
    get: unavailable,
    normalizeId: unavailable,
    query: unavailable,
    system: { get: unavailable, normalizeId: unavailable, query: unavailable },
  },
  meta: {
    getDeploymentMetadata: unavailable,
    getFunctionMetadata: unavailable,
    getSnapshotTs: unavailable,
    getTransactionMetrics: unavailable,
  },
  runQuery: unavailable,
  storage: { getMetadata: unavailable, getUrl: unavailable },
}

export const auth = createAuth({
  ...createAuthOptions(schemaGenerationContext),
})
