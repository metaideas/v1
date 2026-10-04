import { events } from "@v1/workflows/events"
import { HTTPException } from "hono/http-exception"
import { requireSession } from "#shared/middleware.ts"
import { factory } from "#shared/utils.ts"

export default factory
  .createApp()
  .post("/", requireSession, async (c) => {
    const { ids } = await c.var.workflows.send(
      events.demo.welcome.requested.create({ userId: c.var.session.user.id })
    )

    return c.json({ id: ids[0] }, 202)
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
