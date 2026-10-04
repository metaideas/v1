import { trpcServer } from "@hono/trpc-server"
import authProcedures from "#features/auth/handlers.ts"
import { createRouter, createTRPCContext, protectedProcedure } from "#shared/trpc.ts"
import { factory } from "#shared/utils.ts"

export const trpcRouter = createRouter({
  auth: authProcedures,
  hello: protectedProcedure.query(() => ({
    message: "Hello, this message is from the TRPC server!",
  })),
})

export type TRPCRouter = typeof trpcRouter

export default factory.createApp().use(
  "/*",
  trpcServer({
    createContext: createTRPCContext,
    router: trpcRouter,
  })
)
