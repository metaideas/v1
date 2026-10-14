import type { Options } from "@arcjet/ip"
import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { findClientIp } from "#shared/middleware.ts"

const PEER_ADDRESS = "93.184.216.34"
const PRIVATE_PEER_ADDRESS = "10.0.0.2"

// Bun passes its server as the second argument to `fetch`, and the server reports the peer address.
function serverFor(address: string) {
  return { requestIP: () => ({ address, family: "IPv4", port: 443 }) }
}

async function requestClientIp(
  headers: Record<string, string>,
  options: Options = {},
  peer = PEER_ADDRESS
) {
  const app = new Hono().get("/", (c) => c.text(findClientIp(c, options)))
  const response = await app.request("/", { headers }, serverFor(peer))

  return response.text()
}

describe("findClientIp", () => {
  test("ignores forwarding headers when the peer is a public address", async () => {
    expect(await requestClientIp({ "x-forwarded-for": "1.2.3.4" })).toBe(PEER_ADDRESS)
  })

  test("ignores forwarding headers when the peer is an untrusted private address", async () => {
    const first = await requestClientIp({ "x-forwarded-for": "1.2.3.4" }, {}, PRIVATE_PEER_ADDRESS)
    const second = await requestClientIp({ "x-forwarded-for": "5.6.7.8" }, {}, PRIVATE_PEER_ADDRESS)

    expect([first, second]).toEqual([PRIVATE_PEER_ADDRESS, PRIVATE_PEER_ADDRESS])
  })

  test("reads the forwarding header past a trusted private proxy", async () => {
    const ip = await requestClientIp(
      { "x-forwarded-for": "1.2.3.4" },
      { proxies: ["10.0.0.0/8"] },
      PRIVATE_PEER_ADDRESS
    )

    expect(ip).toBe("1.2.3.4")
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
