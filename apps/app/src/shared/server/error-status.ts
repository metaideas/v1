import type * as z from "@v1/utils/schema"
import type { ThrownStatusSchema } from "#shared/server/schemas.ts"

/**
 * The status Start answers an uncaught error with, mirroring `resolveErrorStatus` in
 * `@tanstack/start-server-core`: an error status set through a response helper, else the first of
 * `status`, `statusCode`, `cause.status`, and `cause.statusCode` when it is an error status, else 500.
 */
export function resolveErrorStatus(
  thrown: z.infer<typeof ThrownStatusSchema>,
  helperStatus: number
) {
  if (helperStatus >= 400) {
    return helperStatus
  }

  const status = Number(
    thrown.status ?? thrown.statusCode ?? thrown.cause?.status ?? thrown.cause?.statusCode
  )

  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500
}
