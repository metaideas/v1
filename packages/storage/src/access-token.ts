const EXPIRY_MARGIN_MS = 30_000

function getExpiresAt(token: string) {
  const payload: unknown = JSON.parse(
    atob((token.split(".")[1] ?? "").replaceAll("-", "+").replaceAll("_", "/"))
  )

  return typeof payload === "object" && payload !== null && "exp" in payload
    ? Number(payload.exp) * 1000
    : 0
}

/**
 * Reuses an access token until shortly before it expires, and shares one request between callers
 * that ask for a token at the same time.
 */
export function createCachedAccessToken(getToken: () => Promise<string>, now = Date.now) {
  let cached: { expiresAt: number; token: string } | undefined
  let pending: Promise<string> | undefined

  return function getCachedAccessToken() {
    if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > now()) return Promise.resolve(cached.token)

    pending ??= getToken()
      .then((token) => {
        cached = { expiresAt: getExpiresAt(token), token }
        return token
      })
      .finally(() => {
        pending = undefined
      })

    return pending
  }
}
