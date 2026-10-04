import { greetUser } from "#features/demo/handlers.ts"
import { requireSession } from "#shared/middleware.ts"
import { workflows } from "#shared/services.ts"
import { factory } from "#shared/utils.ts"

export default factory.createApp().post("/", requireSession, (c) => {
  const run = workflows.run(greetUser, { userId: c.var.session.user.id })

  return c.json({ id: run.id }, 202)
})
