import { createRealtimeHandler } from "@v1/realtime/server"
import type { AccessTokenAppContext } from "#shared/types.ts"
import { requireAccessToken } from "#shared/middleware.ts"
import { services } from "#shared/services.ts"
import { context, factory } from "#shared/utils.ts"

export const realtimeHandler = createRealtimeHandler({
  authorize: {
    demo: ({ params }) => params.userId === context<AccessTokenAppContext>().var.userId,
  },
  realtime: services.realtime,
})

export default factory
  .createApp()
  .post("/", requireAccessToken, (c) => realtimeHandler.handle(c.req.raw))
