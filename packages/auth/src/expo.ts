import { expoClient as baseExpoClient } from "@better-auth/expo/client"
import { AUTH_COOKIE_PREFIX } from "#constants.ts"

export function createExpoClient(opts: Parameters<typeof baseExpoClient>[0]) {
  return baseExpoClient({
    // Must match the backend's cookie prefix: the Expo plugin only persists
    // cookies whose names start with this value, and it defaults to
    // "better-auth" when unset. Backends that namespace their cookies, such
    // as the Hono API, pass their own prefix.
    cookiePrefix: AUTH_COOKIE_PREFIX,
    scheme: AUTH_COOKIE_PREFIX,
    storagePrefix: AUTH_COOKIE_PREFIX,
    ...opts,
  })
}
