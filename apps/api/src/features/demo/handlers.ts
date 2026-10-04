import { createWorkflow } from "@tanstack/workflow-core"
import { z } from "zod"
import { log } from "#shared/logger.ts"
import { workflows } from "#shared/services.ts"

export const greetUser = workflows.define(
  createWorkflow({ id: "greetUser", input: z.object({ userId: z.string() }) }).handler(
    async (ctx) => {
      const greeting = await ctx.step("composeGreeting", () => `Hello, ${ctx.input.userId}`)

      await ctx.sleep(1000, { id: "pause" })

      await ctx.step("deliverGreeting", () => {
        log.info({ message: greeting, scope: "workflows", userId: ctx.input.userId })
      })

      return { greeting }
    }
  )
)
