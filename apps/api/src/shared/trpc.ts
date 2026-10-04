import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"
import type { Context } from "hono"
import { initTRPC, TRPCError } from "@trpc/server"
import * as z from "@v1/utils/schema"
import superjson from "superjson"
import type { AppContext } from "#shared/types.ts"

export function createTRPCContext(opts: FetchCreateContextFnOptions, c: Context<AppContext>) {
  return {
    auth: c.var.auth,
    db: c.var.db,
    info: opts.info,
    kv: c.var.kv,
    log: c.var.log,
    req: opts.req,
    resHeaders: opts.resHeaders,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

export const t = initTRPC.context<TRPCContext>().create({
  errorFormatter(formatterInput) {
    const { error } = formatterInput
    const formattedError = formatterInput["shape"]

    return {
      ...formattedError,
      data: {
        ...formattedError.data,
        zodError: error.cause instanceof z.ZodError ? z.flattenError(error.cause) : null,
      },
    }
  },
  transformer: superjson,
})

export const createRouter = t.router

export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await ctx.auth.api.getSession({ headers: ctx.req.headers })

  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  return next({ ctx: { ...ctx, session } })
})
