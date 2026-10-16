import * as z from "@v1/utils/schema/mini"
import { defineChannel } from "#channels/define.ts"

export const demo = defineChannel({
  events: {
    greeted: z.object({ message: z.string() }),
  },
  params: z.object({ userId: z.string() }),
})
