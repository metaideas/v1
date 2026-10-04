import { hc } from "hono/client"
import type { router } from "#routes/index.ts"

export function createClient(...args: Parameters<typeof hc>): ReturnType<typeof hc<typeof router>> {
  return hc<typeof router>(...args)
}

export type { TRPCRouter } from "#routes/trpc.ts"
