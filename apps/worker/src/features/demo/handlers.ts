import type { JobPayload } from "@v1/jobs/worker"
import { log } from "#shared/logger.ts"

export function greetUser({ userId }: JobPayload<"default", "greet-user">) {
  log.info({ message: `Hello, ${userId}`, scope: "jobs", userId })

  return Promise.resolve()
}
