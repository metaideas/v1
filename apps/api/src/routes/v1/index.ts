import * as z from "@v1/utils/schema"
import { describeRoute, resolver, validator } from "hono-openapi"
import demoRoutes from "#routes/v1/demo.ts"
import { m } from "#shared/internationalization/messages.js"
import { requireSession, withRateLimiting } from "#shared/middleware.ts"
import { factory } from "#shared/utils.ts"

export default factory
  .createApp()
  .get(
    "/hello",
    describeRoute({
      description: "Say hello to the user",
      responses: {
        200: {
          content: {
            "text/plain": {
              schema: resolver(z.string()),
            },
          },
          description: "Successful response",
        },
      },
    }),
    withRateLimiting({ limit: 60, name: "hello", window: "1 minute" }),
    validator("query", z.object({ name: z.string().optional() })),
    (c) => {
      const query = c.req.valid("query")

      return c.text(
        m.api_hello_greeting({ name: query.name ?? "Hono" }, { locale: c.var.language })
      )
    }
  )
  .get("/me", requireSession, (c) => c.json(c.var.session.user))
  .route("/demo", demoRoutes)
