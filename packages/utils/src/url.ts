import { cleanDoubleSlashes, joinURL, normalizeURL, withQuery, withTrailingSlash } from "ufo"

/**
 * Creates a URL builder function for a given base URL.
 *
 * The builder normalizes paths, cleans double slashes, and handles query parameters.
 */
export function createUrlBuilder(baseUrl: string, protocol: "http" | "https" = "https") {
  const trimmedBaseUrl = baseUrl.trim()
  const base = /^https?:\/\//i.test(trimmedBaseUrl)
    ? trimmedBaseUrl.replace(/^https?:\/\//i, `${protocol}://`)
    : `${protocol}://${trimmedBaseUrl}`

  return function buildUrl(
    pathname: string,
    options?: {
      query?: Record<string, string | number | boolean | undefined>
    }
  ) {
    const joined = joinURL(base, pathname)
    const cleaned = cleanDoubleSlashes(joined)
    let normalized = normalizeURL(cleaned)

    if (pathname === "" || pathname === "/") {
      normalized = withTrailingSlash(normalized)
    }

    if (!options?.query) {
      return normalized
    }

    const filteredQuery: Record<string, string | number | boolean> = {}
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) filteredQuery[key] = value
    }

    return withQuery(normalized, filteredQuery)
  }
}
