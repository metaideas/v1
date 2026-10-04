import { httpRouter } from "convex/server"
import { authComponent, convexAuth } from "#functions/auth.ts"
import { getTrustedOrigins } from "#functions/shared/auth.ts"

const http = httpRouter()

authComponent.registerRoutes(http, convexAuth, {
  cors: {
    allowedOrigins: getTrustedOrigins(),
  },
})

export default http
