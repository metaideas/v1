import { greetUser } from "#features/demo/handlers.ts"
import { requireSession } from "#shared/middleware.ts"
import { factory } from "#shared/utils.ts"

export default factory.createApp().post("/", requireSession, async (c) => {
  const run = await c.var.workflows.run(
    greetUser,
    { userId: c.var.session.user.id },
    { queue: "default" }
  )

  return c.json({ id: run.id }, 202)
})
