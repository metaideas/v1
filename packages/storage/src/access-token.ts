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
 * that ask for a token at the same time. `reset` forgets the token, including one still being
 * fetched, so a token for a previous session is never reused.
 */
export function createCachedAccessToken(getToken: () => Promise<string>, now = Date.now) {
  let cached: { expiresAt: number; token: string } | undefined
  let pending: Promise<string> | undefined
  let generation = 0

  function get() {
    if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > now()) return Promise.resolve(cached.token)
    if (pending) return pending

    const requestGeneration = generation
    const request = getToken()
      .then((token) => {
        if (requestGeneration === generation) cached = { expiresAt: getExpiresAt(token), token }
        return token
      })
      .finally(() => {
        if (pending === request) pending = undefined
      })
    pending = request

    return request
  }

  function reset() {
    generation += 1
    cached = undefined
    pending = undefined
  }

  return { get, reset }
}
