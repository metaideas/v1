import * as Faultier from "faultier"
import { channel } from "typedport"
import * as z from "zod"

export const LocalTextFileSchema = z.object({
  contents: z.string(),
  path: z.string(),
})

export type LocalTextFile = z.infer<typeof LocalTextFileSchema>

/**
 * The renderer asked to save a path that the user did not pick through the open dialog.
 */
export class UnselectedPathError extends Faultier.Tagged("UnselectedPathError")<{
  path: string
}>() {}

export const LocalFilesFault = Faultier.registry({ UnselectedPathError })

export const localFiles = {
  open: channel({ input: z.void(), output: LocalTextFileSchema.nullable() }),
  save: channel({ input: LocalTextFileSchema, output: z.void() }),
}
