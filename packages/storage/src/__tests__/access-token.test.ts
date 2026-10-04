import { describe, expect, mock, test } from "bun:test"
import { createCachedAccessToken } from "#access-token.ts"

function createToken(expiresAtSeconds: number) {
  const payload = btoa(JSON.stringify({ exp: expiresAtSeconds, sub: "user_1" }))
  return `header.${payload.replaceAll("=", "")}.signature`
}

describe("createCachedAccessToken", () => {
  test("reuses a token until shortly before it expires", async () => {
    let now = 1_000_000
    const getToken = mock(() => Promise.resolve(createToken(now / 1000 + 15 * 60)))
    const getAccessToken = createCachedAccessToken(getToken, () => now).get

    const first = await getAccessToken()
    now += 10 * 60 * 1000
    const second = await getAccessToken()

    expect(second).toBe(first)
    expect(getToken).toHaveBeenCalledTimes(1)
  })

  test("fetches a new token when the cached one is about to expire", async () => {
    let now = 1_000_000
    const getToken = mock(() => Promise.resolve(createToken(now / 1000 + 15 * 60)))
    const getAccessToken = createCachedAccessToken(getToken, () => now).get

    await getAccessToken()
    now += 15 * 60 * 1000 - 10_000
    await getAccessToken()

    expect(getToken).toHaveBeenCalledTimes(2)
  })

  test("shares one request between concurrent callers", async () => {
    const getToken = mock(() => Promise.resolve(createToken(Date.now() / 1000 + 60 * 60)))
    const getAccessToken = createCachedAccessToken(getToken).get

    const tokens = await Promise.all([getAccessToken(), getAccessToken(), getAccessToken()])

    expect(new Set(tokens).size).toBe(1)
    expect(getToken).toHaveBeenCalledTimes(1)
  })

  test("fetches again after a failed request", async () => {
    const getToken = mock((): Promise<string> => Promise.reject(new Error("offline")))
    const getAccessToken = createCachedAccessToken(getToken).get

    const error = await getAccessToken().catch((error: unknown) => error)
    getToken.mockImplementation(() => Promise.resolve(createToken(Date.now() / 1000 + 60)))
    const token = await getAccessToken()

    expect(error).toBeInstanceOf(Error)
    expect(token).toContain("header.")
    expect(getToken).toHaveBeenCalledTimes(2)
  })

  test("fetches a new token after a reset", async () => {
    const getToken = mock(() => Promise.resolve(createToken(Date.now() / 1000 + 60 * 60)))
    const accessToken = createCachedAccessToken(getToken)

    await accessToken.get()
    accessToken.reset()
    await accessToken.get()

    expect(getToken).toHaveBeenCalledTimes(2)
  })

  test("does not cache a token that was still being fetched during a reset", async () => {
    const previous = Promise.withResolvers<string>()
    const getToken = mock(() => previous.promise)
    const accessToken = createCachedAccessToken(getToken)

    const stale = accessToken.get()
    accessToken.reset()
    previous.resolve(createToken(Date.now() / 1000 + 60 * 60))
    await stale
    getToken.mockImplementation(() => Promise.resolve(createToken(Date.now() / 1000 + 60 * 60)))
    await accessToken.get()

    expect(getToken).toHaveBeenCalledTimes(2)
  })
})
