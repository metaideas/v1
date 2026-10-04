import { createFileStorageRouter } from "@v1/storage/server"
import type { AccessTokenAppContext } from "#shared/types.ts"
import { ENV } from "#shared/env.generated.ts"
import { requireAccessToken } from "#shared/middleware.ts"
import { storage } from "#shared/services.ts"
import { allowedOrigins, context, factory } from "#shared/utils.ts"

const router = createFileStorageRouter({
  allowedOrigins,
  getKeyPrefix: () => `users/${context<AccessTokenAppContext>().var.userId}/`,
  secret: ENV.FILES_API_SECRET,
  storage,
})

export default factory.createApp().all("/", requireAccessToken, (c) => router.handle(c.req.raw))
