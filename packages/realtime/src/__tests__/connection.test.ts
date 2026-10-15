import { describe, expect, test } from "bun:test"
import * as z from "@v1/utils/schema/mini"
import { waitUntil } from "#__tests__/fakes.ts"
import { createConnection } from "#connection.ts"
import { type SubscribeRequest, SubscribeRequestSchema } from "#protocol.ts"

type Request = {
  body: SubscribeRequest
  close: () => void
  send: (type: string, data: Record<string, unknown>) => void
}

function createServer() {
  const requests: Request[] = []
  const encoder = new TextEncoder()

  function fetch(_url: string, init: { body: string; signal: AbortSignal }) {
    let stream: ReadableStreamDefaultController<Uint8Array> | undefined
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        stream = controller
      },
    })
    init.signal.addEventListener("abort", () => stream?.error(init.signal.reason))
    requests.push({
      body: z.parse(SubscribeRequestSchema, JSON.parse(init.body)),
      close: () => stream?.close(),
      send: (type, data) => {
        stream?.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`))
      },
    })

    return Promise.resolve({ body, ok: true, status: 200 })
  }

  return { fetch, requests }
}

const KEY = 'demo:{"userId":"user_1"}'

describe("createConnection", () => {
  test("reconnects from the cursor its channel reached, skipping events it already delivered", async () => {
    const server = createServer()
    const connection = createConnection({
      endpoint: "http://localhost/realtime",
      fetch: server.fetch,
      getToken: () => Promise.resolve("token"),
    })
    const received: string[] = []

    connection.subscribe(
      "demo",
      { userId: "user_1" },
      {
        onMessage: ({ cursor }) => received.push(cursor),
      }
    )
    await waitUntil(() => server.requests.length === 1)
    server.requests[0]?.send("message", {
      cursor: "3-0",
      data: { message: "Hi" },
      event: "greeted",
      key: KEY,
    })
    server.requests[0]?.close()
    await waitUntil(() => server.requests.length === 2)
    server.requests[1]?.send("message", {
      cursor: "3-0",
      data: { message: "Hi" },
      event: "greeted",
      key: KEY,
    })
    server.requests[1]?.send("message", {
      cursor: "4-0",
      data: { message: "Hey" },
      event: "greeted",
      key: KEY,
    })
    await waitUntil(() => received.length === 2)

    expect(server.requests.map(({ body }) => body.subscriptions[0]?.cursor)).toEqual([
      undefined,
      "3-0",
    ])
    expect(received).toEqual(["3-0", "4-0"])
  })
})
