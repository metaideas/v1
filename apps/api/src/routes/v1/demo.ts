import { HTTPException } from "hono/http-exception"
import { greetUser } from "#features/demo/handlers.ts"
import { requireSession } from "#shared/middleware.ts"
import { factory } from "#shared/utils.ts"

export default factory
  .createApp()
  .post("/", requireSession, async (c) => {
    const run = await c.var.workflows.run(
      greetUser,
      { userId: c.var.session.user.id },
      { queue: "default" }
    )

    return c.json({ id: run.id }, 202)
  })
  .post("/jobs", requireSession, async (c) => {
    const result = await c.var.dispatcher.dispatch("default", "greet-user", {
      userId: c.var.session.user.id,
    })

    if (result instanceof Error) {
      throw new HTTPException(503, { message: "The job could not be queued" })
    }

    return c.json({ id: result.id }, 202)
  })
