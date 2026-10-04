import * as z from "@v1/utils/schema"
import { eventType } from "inngest"

export const demo = {
  welcome: {
    requested: eventType("demo/welcome.requested", {
      schema: z.object({ userId: z.string() }),
    }),
  },
}
