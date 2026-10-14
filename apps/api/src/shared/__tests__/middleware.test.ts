import type { Options } from "@arcjet/ip"
import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { findClientIp } from "#shared/middleware.ts"

const PEER_ADDRESS = "93.184.216.34"

// Bun passes its server as the second argument to `fetch`, and the server reports the peer address.
const server = { requestIP: () => ({ address: PEER_ADDRESS, family: "IPv4", port: 443 }) }

async function requestClientIp(headers: Record<string, string>, options: Options = {}) {
  const app = new Hono().get("/", (c) => c.text(findClientIp(c, options)))
  const response = await app.request("/", { headers }, server)

  return response.text()
}

describe("findClientIp", () => {
  test("ignores forwarding headers when the peer is a public address", async () => {
    expect(await requestClientIp({ "x-forwarded-for": "1.2.3.4" })).toBe(PEER_ADDRESS)
  })

  test("reads the forwarding header past a trusted proxy", async () => {
    const ip = await requestClientIp(
      { "x-forwarded-for": "1.2.3.4" },
      { proxies: [`${PEER_ADDRESS}/32`] }
    )

    expect(ip).toBe("1.2.3.4")
  })

  test("trusts only the platform header when a platform is set", async () => {
    const ip = await requestClientIp(
      { "fly-client-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" },
      { platform: "fly-io" }
    )

    expect(ip).toBe("1.2.3.4")
  })
})
