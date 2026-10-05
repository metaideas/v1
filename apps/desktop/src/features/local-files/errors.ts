import * as Faultier from "faultier"

/**
 * The renderer asked to save a path that the user did not pick through the open dialog.
 */
export class UnselectedPathError extends Faultier.Tagged("UnselectedPathError")<{
  path: string
}>() {}

export const LocalFilesFault = Faultier.registry({ UnselectedPathError })
