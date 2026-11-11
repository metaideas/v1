import * as Fault from "@sanely/errors"

/**
 * The renderer asked to save a path that the user did not pick through the open dialog.
 */
export class UnselectedPathError extends Fault.Tagged("UnselectedPathError")<{
  path: string
}>() {}

export const LocalFilesFault = Fault.registry({ UnselectedPathError })
