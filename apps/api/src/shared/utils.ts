import type { ContentfulStatusCode } from "hono/utils/http-status"
import { getContext } from "hono/context-storage"
import { createFactory } from "hono/factory"
import type { AppContext } from "#shared/types.ts"
import { ENV } from "#shared/env.generated.ts"

const CONTENTLESS_STATUS_CODES: ReadonlySet<number> = new Set([101, 204, 205, 304])

export const allowedOrigins = ENV.ALLOWED_API_ORIGINS

export const factory = createFactory<AppContext>()

export function context<T extends AppContext = AppContext>() {
  return getContext<T>()
}

function isContentfulStatusCode(status: number): status is ContentfulStatusCode {
  return (
    Number.isInteger(status)
    && status >= 100
    && status <= 599
    && !CONTENTLESS_STATUS_CODES.has(status)
  )
}

/**
 * Narrows an arbitrary status, such as one parsed from an error, to one a JSON response can carry.
 * Anything else becomes 500.
 */
export function toContentfulStatusCode(status: number) {
  return isContentfulStatusCode(status) ? status : 500
}
