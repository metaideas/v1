import { createFileStorageRouter } from "@v1/storage/server"
import type { AuthenticatedAppContext } from "#shared/types.ts"
import { ENV } from "#shared/env.generated.ts"
import { requireSession } from "#shared/middleware.ts"
import { storage } from "#shared/services.ts"
import { allowedOrigins, context, factory } from "#shared/utils.ts"

const router = createFileStorageRouter({
  allowedOrigins,
  getKeyPrefix: () => `users/${context<AuthenticatedAppContext>().var.session.user.id}/`,
  secret: ENV.FILES_API_SECRET,
  storage,
})

export default factory.createApp().all("/", requireSession, (c) => router.handle(c.req.raw))
