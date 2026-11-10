import { describe, expect, test } from "vitest"
import { createUrlBuilder } from "#url.ts"

describe("createUrlBuilder", () => {
  test("defaults to https protocol", () => {
    expect(createUrlBuilder("example.com")("/test")).toBe("https://example.com/test")
  })

  test("replaces an existing protocol with the requested one", () => {
    expect(createUrlBuilder("HTTP://example.com")("/test")).toBe("https://example.com/test")
    expect(createUrlBuilder("https://localhost:3000/api", "http")("/health")).toBe(
      "http://localhost:3000/api/health"
    )
  })

  test("joins paths onto the base path and collapses duplicate slashes", () => {
    const buildUrl = createUrlBuilder("example.com/api//v1")
    expect(buildUrl("//users//123")).toBe("https://example.com/api/v1/users/123")
    expect(buildUrl("users/")).toBe("https://example.com/api/v1/users/")
  })

  test("adds a trailing slash for empty and root paths", () => {
    const buildUrl = createUrlBuilder("example.com")
    expect(buildUrl("")).toBe("https://example.com/")
    expect(buildUrl("/")).toBe("https://example.com/")
  })

  test("omits undefined query parameters", () => {
    expect(
      createUrlBuilder("example.com")("/test", {
        query: { active: false, filter: undefined, page: 1 },
      })
    ).toBe("https://example.com/test?active=false&page=1")
  })
})
