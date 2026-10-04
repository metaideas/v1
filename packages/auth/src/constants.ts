import { seconds } from "humanspan"

export const AUTH_COOKIE_PREFIX = "v1"
// The API's auth instance namespaces its cookies so the two localhost jars
// stay separate during development.
export const AUTH_API_COOKIE_PREFIX = `${AUTH_COOKIE_PREFIX}-api`
export const AUTH_APP_NAME = "v1"

export const AUTH_ADVANCED_OPTIONS = {
  cookiePrefix: AUTH_COOKIE_PREFIX,
  database: { generateId: false },
} as const

export const AUTH_EMAIL_AND_PASSWORD_OPTIONS = {
  autoSignIn: true,
  enabled: true,
} as const

// Access tokens let a client call a service on another origin, such as the storage gateway, without
// reading the HttpOnly session cookie. Clients fetch one per call, so a short lifetime costs nothing
// and limits a leaked token.
export const AUTH_ACCESS_TOKEN_OPTIONS = {
  expirationTime: "5m",
} as const

export const AUTH_SESSION_OPTIONS = {
  expiresIn: seconds("30d"),
  updateAge: seconds("15d"),
} as const
