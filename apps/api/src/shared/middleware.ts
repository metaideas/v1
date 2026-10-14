import type { Context } from "hono"
import { type Options, findIp } from "@arcjet/ip"
import { getConnInfo } from "@hono/bun"
import { identifyUser } from "evlog/better-auth"
import { rateLimiter } from "hono-rate-limiter"
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { languageDetector } from "hono/language"
import { type TimeExpression, ms } from "humanspan"
import type { AccessTokenAppContext, AppContext, AuthenticatedAppContext } from "#shared/types.ts"
import { ENV } from "#shared/env.generated.ts"
import { baseLocale, locales } from "#shared/internationalization/runtime.js"

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

/**
 * Finds the IP address of the client that sent the request. With a `platform`, it trusts only that
 * platform's client IP header. Otherwise it uses the connection's peer address, and reads
 * forwarding headers only when the peer is a private address or one of the trusted `proxies`.
 */
export function findClientIp(c: Context, options: Options) {
  const peer = options.platform ? undefined : { remoteAddress: getConnInfo(c).remote.address }

  return findIp({ headers: c.req.raw.headers, socket: peer }, options)
}

/**
 * Adds basic rate limiting protection with a fixed window to the request.
 */
export function withRateLimiting(interval: TimeExpression, limit: number) {
  return rateLimiter<AppContext>({
    keyGenerator: (c) =>
      findClientIp(c, { platform: ENV.CLIENT_IP_PLATFORM, proxies: ENV.TRUSTED_PROXIES }),
    limit,
    standardHeaders: "draft-7",
    windowMs: ms(interval),
  })
}
