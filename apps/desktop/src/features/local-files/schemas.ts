import { channel, defineContract } from "typedport"
import * as z from "zod"

export const LocalTextFileSchema = z.object({
  contents: z.string(),
  path: z.string(),
})

export type LocalTextFile = z.infer<typeof LocalTextFileSchema>

export const localFilesContract = defineContract({
  localFiles: {
    open: channel({ input: z.void(), output: LocalTextFileSchema.nullable() }),
    save: channel({ input: LocalTextFileSchema, output: z.void() }),
  },
})
