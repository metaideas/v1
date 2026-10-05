import type { JobPayload } from "@v1/jobs/runner"
import { events } from "@v1/workflows/events"
import { log } from "#shared/logger.ts"
import { workflows } from "#shared/services.ts"

export function greetUser({ userId }: JobPayload<"default", "greet-user">) {
  log.info({ message: `Hello, ${userId}`, scope: "jobs", userId })

  return Promise.resolve()
}

export const welcomeUser = workflows.createFunction(
  { concurrency: { limit: 10 }, id: "welcome-user", triggers: [events.demo.welcome.requested] },
  async ({ event, logger, step }) => {
    const { userId } = event.data
    const message = await step.run("compose-welcome", () => `Welcome, ${userId}`)

    await step.sleep("pause", "1s")

    await step.run("deliver-welcome", () => {
      logger.info({ userId }, message)
    })

    return { message }
  }
)
