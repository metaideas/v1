import * as z from "@v1/utils/schema"

// A status of another type counts as absent, like a missing one.
const StatusCode = z.union([z.string(), z.number()]).nullish().catch(null)

const StatusFields = z.object({ status: StatusCode, statusCode: StatusCode })

/**
 * The status fields of a thrown value and of its cause. A value without them, such as a thrown
 * string, parses to no fields.
 */
export const ThrownStatus = StatusFields.extend({
  cause: StatusFields.nullish().catch(null),
}).catch({})

/**
 * The status Start answers an uncaught error with, mirroring `resolveErrorStatus` in
 * `@tanstack/start-server-core`: an error status set through a response helper, else the first of
 * `status`, `statusCode`, `cause.status`, and `cause.statusCode` when it is an error status, else 500.
 */
export function resolveErrorStatus(thrown: z.infer<typeof ThrownStatus>, helperStatus: number) {
  if (helperStatus >= 400) {
    return helperStatus
  }

  const status = Number(
    thrown.status ?? thrown.statusCode ?? thrown.cause?.status ?? thrown.cause?.statusCode
  )

  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500
}
