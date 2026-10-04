import type { Auth, BetterAuthClientPlugin } from "better-auth"
import { inferAdditionalFields, jwtClient } from "better-auth/client/plugins"
import { createAuthClient as createBetterAuthClient } from "better-auth/react"

export function createAuthClient<Plugin extends BetterAuthClientPlugin = never>(
  url: string,
  plugins: Plugin[] = []
) {
  return createBetterAuthClient({
    baseURL: url,
    plugins: [inferAdditionalFields<Auth>(), jwtClient(), ...plugins],
  })
}
