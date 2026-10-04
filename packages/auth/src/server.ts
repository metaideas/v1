import type { Logger } from "@v1/core/services/logging"
import type { BetterAuthPlugin, SocialProviders } from "better-auth"
import { type DB, drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth/minimal"
import { jwt } from "better-auth/plugins/jwt"
import {
  AUTH_ACCESS_TOKEN_OPTIONS,
  AUTH_ADVANCED_OPTIONS,
  AUTH_APP_NAME,
  AUTH_EMAIL_AND_PASSWORD_OPTIONS,
  AUTH_SESSION_OPTIONS,
} from "#constants.ts"

export { APIError as AuthError } from "better-auth/api"
export {
  type BetterAuthOptions as AuthOptions,
  betterAuth as createAuth,
} from "better-auth/minimal"
export { expo } from "@better-auth/expo"

type ServerAuthOptions<Plugins extends BetterAuthPlugin[]> = {
  /**
   * Path where the application mounts the auth handler, such as `/api/auth`.
   */
  basePath: string
  /**
   * Public origin where the application serves auth.
   */
  baseUrl: string
  /**
   * Parent domain that shares the session cookie across subdomains, such as `example.com`.
   */
  cookieDomain?: string
  /**
   * Prefix for auth cookies. Applications that share a host use different prefixes.
   */
  cookiePrefix?: string
  database: DB
  logger?: Logger
  /**
   * Better Auth plugins. Pass `[]` for none, so the returned type keeps each plugin's endpoints and
   * session fields.
   */
  plugins: Plugins
  secret: string
  /**
   * Delivers a password reset link. Without it, password reset is unavailable.
   */
  sendPasswordReset?: (input: { email: string; url: string }) => Promise<unknown>
  socialProviders?: SocialProviders
  trustedOrigins: string[]
}

/**
 * Issues short-lived access tokens at `/token` and publishes their keys at `/jwks`. A client sends
 * one as a bearer token to a service on another origin, and the service checks it with
 * `auth.api.verifyJWT`. It stores signing keys in the `jwks` table.
 */
export function createAccessTokenPlugin() {
  return jwt({ jwt: AUTH_ACCESS_TOKEN_OPTIONS, schema: { jwks: { modelName: "jwk" } } })
}

/**
 * Better Auth for a server that owns its user tables. The template's session, cookie, and
 * email-and-password policy lives here, so each application passes only where it serves auth, its
 * secrets, and its integrations.
 */
export function createServerAuth<const Plugins extends BetterAuthPlugin[] = []>(
  options: ServerAuthOptions<Plugins>
) {
  const { logger, sendPasswordReset } = options

  return betterAuth({
    advanced: {
      ...AUTH_ADVANCED_OPTIONS,
      cookiePrefix: options.cookiePrefix ?? AUTH_ADVANCED_OPTIONS.cookiePrefix,
      crossSubDomainCookies: {
        domain: options.cookieDomain,
        enabled: options.cookieDomain !== undefined,
      },
    },
    appName: AUTH_APP_NAME,
    basePath: options.basePath,
    baseURL: options.baseUrl,
    database: drizzleAdapter(options.database, {
      // By default, we use PostgreSQL. Change this to another provider if needed.
      provider: "pg",
      usePlural: true,
    }),
    emailAndPassword: {
      ...AUTH_EMAIL_AND_PASSWORD_OPTIONS,
      sendResetPassword: sendPasswordReset
        ? async ({ url, user }) => {
            await sendPasswordReset({ email: user.email, url })
          }
        : undefined,
    },
    logger: {
      disabled: logger === undefined,
      level: "warn",
      log: (level, message, ...details) => {
        logger?.[level]({ message, scope: "auth", ...(details.length > 0 ? { details } : {}) })
      },
    },
    plugins: options.plugins,
    secret: options.secret,
    session: AUTH_SESSION_OPTIONS,
    socialProviders: options.socialProviders,
    trustedOrigins: options.trustedOrigins,
  })
}

export type ServerAuth = ReturnType<typeof createServerAuth>
