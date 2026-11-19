import { once } from "node:events"
import { createServer } from "node:http"
import { gzipSync } from "node:zlib"
import { describe, expect, test } from "vitest"
import { proxyApiRequest } from "#shared/server/api-proxy.ts"

describe("proxyApiRequest", () => {
  test("forwards a request and returns the upstream redirect and individual cookies", async () => {
    await using upstream = createServer((request, response) => {
      let body = ""
      request.setEncoding("utf8")
      request.on("data", (chunk: string) => {
        body += chunk
      })
      request.on("end", () => {
        response.writeHead(303, {
          "Content-Encoding": "gzip",
          Location: "/dashboard",
          "Set-Cookie": ["session=abc; Path=/; HttpOnly", "state=; Max-Age=0; Path=/"],
        })
        response.end(
          gzipSync(JSON.stringify({ body, cookie: request.headers.cookie, url: request.url }))
        )
      })
    })
    upstream.listen(0, "127.0.0.1")
    await once(upstream, "listening")
    const address = upstream.address()
    if (!address || typeof address === "string") throw new Error("Test API has no TCP address")

    const request = new Request("http://app.example/api/auth/callback?state=abc", {
      body: "code=123",
      headers: { cookie: "state=abc" },
      method: "POST",
    })
    const response = await proxyApiRequest(request, `http://127.0.0.1:${address.port}`)

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("/dashboard")
    expect(response.headers.getSetCookie()).toEqual([
      "session=abc; Path=/; HttpOnly",
      "state=; Max-Age=0; Path=/",
    ])
    expect(response.headers.has("content-encoding")).toBe(false)
    expect(await response.json()).toEqual({
      body: "code=123",
      cookie: "state=abc",
      url: "/auth/callback?state=abc",
    })
  })
})
