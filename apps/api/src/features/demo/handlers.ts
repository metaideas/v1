import { log } from "#shared/logger.ts"
import { workflows } from "#shared/services.ts"

export const greetUser = workflows.define("greetUser", async ({ userId }: { userId: string }) => {
  const greeting = await workflows.step("composeGreeting", () => `Hello, ${userId}`)

  await workflows.sleep(1000)

  await workflows.step("deliverGreeting", () => {
    log.info({ message: greeting, scope: "workflows", userId })
  })

  return { greeting }
})
