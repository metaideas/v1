import { createFileRoute } from "@tanstack/react-router"
import { ENV } from "#shared/env.generated.ts"
import { proxyApiRequest } from "#shared/server/api-proxy.ts"

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: ({ request }) => proxyApiRequest(request, ENV.API_URL),
    },
  },
})
