const REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "last-event-id",
  "origin",
  "range",
  "referer",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "trpc-accept",
  "user-agent",
  "x-request-id",
] as const

export async function proxyApiRequest(request: Request, apiUrl: string) {
  const url = new URL(request.url)
  const upstream = new URL(apiUrl)
  upstream.pathname = url.pathname.slice("/api".length)
  upstream.search = url.search

  const headers = new Headers()
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value !== null) headers.set(name, value)
  }

  let response: Response
  try {
    response = await fetch(new Request(upstream, request), { headers, redirect: "manual" })
  } catch {
    return Response.json({ message: "API unavailable" }, { status: 502 })
  }

  const responseHeaders = new Headers(response.headers)
  // Fetch decodes the body. Let the app server frame the decoded stream for its client.
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")
  responseHeaders.delete("transfer-encoding")
  responseHeaders.delete("connection")
  responseHeaders.delete("keep-alive")

  return new Response(response.body, { headers: responseHeaders, status: response.status })
}
