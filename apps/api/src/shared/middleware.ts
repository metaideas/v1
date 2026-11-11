import type { TimeExpression } from "@sanely/duration"
import type { Context } from "hono"
import { getConnInfo } from "@hono/node-server/conninfo"
import { fixedWindow, headers, rateLimit } from "@sanely/ratelimit"
import { ip } from "@sanely/request"
import { identifyUser } from "evlog/better-auth"
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { languageDetector } from "hono/language"
import type { AccessTokenAppContext, AppContext, AuthenticatedAppContext } from "#shared/types.ts"
import { ENV } from "#shared/env.generated.ts"
import { baseLocale, locales } from "#shared/internationalization/runtime.js"
import { limiter } from "#shared/services.ts"

export const withLanguageDetection = languageDetector({
  caches: false,
  fallbackLanguage: baseLocale,
  order: ["header"],
  supportedLanguages: [...locales],
})

export const requireSession = createMiddleware<AuthenticatedAppContext>(async (c, next) => {
  const session = await c.var.auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" })
  }

  c.set("session", session)
  identifyUser(c.var.log, session)

  await next()
})

/**
 * Authenticates a request by the access token in its `Authorization: Bearer` header instead of the
 * session cookie, for clients on another origin, such as the storage client.
 */
export const requireAccessToken = createMiddleware<AccessTokenAppContext>(async (c, next) => {
  const token = /^Bearer (?<token>\S+)$/iu.exec(c.req.header("authorization") ?? "")?.groups?.token
  const result = token ? await c.var.auth.api.verifyJWT({ body: { token } }) : undefined

  if (!result?.payload) {
    throw new HTTPException(401, { message: "Unauthorized" })
  }

  c.set("userId", result.payload.sub)

  await next()
})

type RateLimitingOptions = {
  /**
   * Labels the limit in the `RateLimit` headers and in its Redis keys, such as `health`.
   */
  name: string
  limit: number
  window: TimeExpression
}

/**
 * Reads the caller's public IP address from the headers that `HOSTING_PLATFORM` sets, or from the
 * connection. Callers without one, such as on localhost, share one count.
 */
function identifyCaller(c: Context<AppContext>) {
  const request = { headers: c.req.raw.headers, ip: getConnInfo(c).remote.address }

  return ip(request, { platform: ENV.HOSTING_PLATFORM }) ?? null
}

/**
 * Allows each caller `limit` requests per fixed `window`. A denied request gets status 429, and
 * when Redis cannot count the request, status 503.
 */
export function withRateLimiting({ limit, name, window }: RateLimitingOptions) {
  const perCaller = limiter({
    algorithm: fixedWindow({ limit, window }),
    identify: identifyCaller,
    name,
  })

  return createMiddleware<AppContext>(async (c, next) => {
    const result = await rateLimit(perCaller, c)

    if (result.reason === "storeError") {
      c.var.log.error(result.error, { rateLimit: { name } })
      throw new HTTPException(503, { message: "Service unavailable" })
    }

    const limitHeaders = headers(result)

    if (!result.success) {
      throw new HTTPException(429, {
        res: new Response("Too many requests", { headers: limitHeaders }),
      })
    }

    for (const [header, value] of Object.entries(limitHeaders)) {
      c.header(header, value)
    }

    await next()
  })
}
