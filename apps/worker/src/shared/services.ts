import { createWorkflows } from "@v1/workflows/client"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"

export const workflows = createWorkflows({
  baseUrl: ENV.INNGEST_BASE_URL,
  eventKey: ENV.INNGEST_EVENT_KEY,
  id: "worker",
  isDev: ENV.INNGEST_DEV,
  logger: log,
  signingKey: ENV.INNGEST_SIGNING_KEY,
  signingKeyFallback: ENV.INNGEST_SIGNING_KEY_FALLBACK,
})
