function getProperty(value: unknown, key: string): unknown {
  return (typeof value === "object" && value !== null) || typeof value === "function"
    ? Reflect.get(value, key)
    : undefined
}

function getStatusCode(value: unknown, key: string) {
  const property = getProperty(value, key)

  return typeof property === "string" || typeof property === "number" ? property : undefined
}

/**
 * The status Start answers an uncaught error with, mirroring `resolveErrorStatus` in
 * `@tanstack/start-server-core`: an error status set through a response helper, else the first of
 * `status`, `statusCode`, `cause.status`, and `cause.statusCode` when it is an error status, else 500.
 */
export function resolveErrorStatus(error: unknown, helperStatus: number) {
  if (helperStatus >= 400) {
    return helperStatus
  }

  const cause = getProperty(error, "cause")
  const status = Number(
    getStatusCode(error, "status")
      ?? getStatusCode(error, "statusCode")
      ?? getStatusCode(cause, "status")
      ?? getStatusCode(cause, "statusCode")
  )

  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500
}
