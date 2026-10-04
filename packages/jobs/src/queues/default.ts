import * as z from "@v1/utils/schema"
import { defineJob, defineQueue } from "#define.ts"

export const defaultQueue = defineQueue({
  concurrency: 10,
  jobs: {
    "greet-user": defineJob({ payload: z.object({ userId: z.string() }) }),
  },
})
