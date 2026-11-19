import * as try$ from "@sanely/try"
import { events } from "@v1/workflows/events"
import { HTTPException } from "hono/http-exception"
import { requireSession } from "#shared/middleware.ts"
import { factory } from "#shared/utils.ts"

export default factory
  .createApp()
  .post("/", requireSession, async (c) => {
    const event = events.demo.welcome.requested.create({ userId: c.var.session.user.id })
    // The Inngest client throws when it cannot send the event.
    const result = await try$.run(() => c.var.workflows.send(event))

    if (result instanceof Error) {
      throw new HTTPException(503, {
        cause: result.cause,
        message: "The workflow could not be started",
      })
    }

    return c.json({ id: result.ids[0] }, 202)
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
  .post("/realtime", requireSession, async (c) => {
    const result = await c.var.realtime
      .channel("demo", { userId: c.var.session.user.id })
      .emit("greeted", { message: `Hello, ${c.var.session.user.name}` })

    if (result instanceof Error) {
      throw new HTTPException(503, { message: "The event could not be published" })
    }

    return c.json({ cursor: result.cursor }, 202)
  })
