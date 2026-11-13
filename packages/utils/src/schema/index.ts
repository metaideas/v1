import * as z from "zod"

// Create custom zod types here and import them to other packages under the `z` namespace. Keep
// the Mini versions in `mini.ts` in sync.
const PROTOCOL_REGEX = /^https?$/

/**
 * Specifically for web URLs. Doesn't support localhost:port style URLs.
 */
export function httpUrl() {
  return z.url({
    hostname: z.regexes.domain,
    protocol: PROTOCOL_REGEX,
  })
}

export function env() {
  return z.enum(["development", "production", "test"])
}

export function branded<T extends string>(brand: T) {
  return z.string().brand(brand)
}

/**
 * Validates IPv4 and IPv6 addresses.
 */
export function ip() {
  return z.union([z.ipv4(), z.ipv6()])
}

// oxlint-disable-next-line no-barrel-file -- this module extends Zod, so callers import one schema module
export * from "zod"
