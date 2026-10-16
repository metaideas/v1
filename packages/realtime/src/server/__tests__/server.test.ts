import { beforeEach, describe, expect, test } from "bun:test"
import { PublishEventError, RealtimePayloadError } from "@v1/core/errors"
import * as z from "@v1/utils/schema/mini"
import { ms } from "humanspan"
import { mockRedis, readEvents } from "#server/__tests__/fakes.ts"

const redis = await mockRedis()

const { createRealtime } = await import("#server/realtime.ts")
const { createRealtimeHandler } = await import("#server/handler.ts")

const KEY = 'demo:{"userId":"user_1"}'
const REDIS_KEY = `realtime:${KEY}`

function setup({ isAllowed = true } = {}) {
  const realtime = createRealtime({ url: "redis://localhost:6379" })
  const handler = createRealtimeHandler({ authorize: { demo: () => isAllowed }, realtime })

  async function subscribe(subscriptions: unknown[]) {
    const controller = new AbortController()
    const response = await handler.handle(
      new Request("http://localhost/realtime", {
        body: JSON.stringify({ subscriptions }),
        method: "POST",
        signal: controller.signal,
      })
    )

    return { controller, response, ...readEvents(response.body) }
  }

  return {
    channel: realtime.channel("demo", { userId: "user_1" }),
    handler,
    realtime,
    subscribe,
  }
}

const CursorData = z.object({ cursor: z.string() })

function greeting(message: string) {
  return JSON.stringify({ message })
}

beforeEach(() => {
  redis.reset()
})

describe("createRealtime", () => {
  test("returns a payload error without publishing invalid data", async () => {
    const { channel } = setup()

    // @ts-expect-error The data breaks the event's schema on purpose.
    const result = await channel.emit("greeted", { message: 1 })

    expect(result).toBeInstanceOf(RealtimePayloadError)
    expect(redis.server.streams.size).toBe(0)
  })

  test("returns a publish error when Redis rejects the event", async () => {
    const { channel } = setup()
    redis.server.emitError = new Error("Connection is closed")

    const result = await channel.emit("greeted", { message: "Hello" })

    expect(result).toBeInstanceOf(PublishEventError)
  })
})

describe("createRealtimeHandler", () => {
  test("replays the events after the cursor, then streams new ones", async () => {
    const { channel, subscribe } = setup()
    const first = redis.append(REDIS_KEY, "greeted", greeting("one"))
    const second = redis.append(REDIS_KEY, "greeted", greeting("two"))

    const stream = await subscribe([
      { channel: "demo", cursor: first, params: { userId: "user_1" } },
    ])
    await stream.waitFor(2)
    await channel.emit("greeted", { message: "three" })

    expect(await stream.waitFor(3)).toEqual([
      {
        data: { cursor: second, data: { message: "two" }, event: "greeted", key: KEY },
        type: "message",
      },
      { data: { cursor: second, key: KEY }, type: "ready" },
      {
        data: {
          cursor: expect.any(String),
          data: { message: "three" },
          event: "greeted",
          key: KEY,
        },
        type: "message",
      },
    ])
  })

  test("delivers an event published during the replay once", async () => {
    const { subscribe } = setup()
    const first = redis.append(REDIS_KEY, "greeted", greeting("one"))
    redis.server.beforeRead = () => {
      redis.server.beforeRead = undefined
      redis.append(REDIS_KEY, "greeted", greeting("during"))
    }

    const stream = await subscribe([
      { channel: "demo", cursor: first, params: { userId: "user_1" } },
    ])
    await stream.waitFor(2)
    await Bun.sleep(20)

    expect(stream.events.map(({ type }) => type)).toEqual(["message", "ready"])
  })

  test("resets a cursor that Redis no longer holds", async () => {
    const { subscribe } = setup()
    redis.append(REDIS_KEY, "greeted", greeting("one"))
    const latest = redis.append(REDIS_KEY, "greeted", greeting("two"))

    const stream = await subscribe([
      { channel: "demo", cursor: "0-1", params: { userId: "user_1" } },
    ])

    expect(await stream.waitFor(1)).toEqual([{ data: { cursor: latest, key: KEY }, type: "reset" }])
  })

  test("starts a subscription without a cursor after the latest event", async () => {
    const { subscribe } = setup()
    const latest = redis.append(REDIS_KEY, "greeted", greeting("old"))

    const stream = await subscribe([{ channel: "demo", params: { userId: "user_1" } }])

    expect(await stream.waitFor(1)).toEqual([{ data: { cursor: latest, key: KEY }, type: "ready" }])
  })

  test("replays every event after a cursor from an empty channel", async () => {
    const { subscribe } = setup()
    const empty = await subscribe([{ channel: "demo", params: { userId: "user_1" } }])
    const [ready] = await empty.waitFor(1)
    empty.controller.abort()
    const first = redis.append(REDIS_KEY, "greeted", greeting("one"))
    const second = redis.append(REDIS_KEY, "greeted", greeting("two"))

    const stream = await subscribe([
      {
        channel: "demo",
        cursor: z.parse(CursorData, ready?.data).cursor,
        params: { userId: "user_1" },
      },
    ])

    const events = await stream.waitFor(3)

    expect(events.map(({ data, type }) => [type, z.parse(CursorData, data).cursor])).toEqual([
      ["message", first],
      ["message", second],
      ["ready", second],
    ])
  })

  test("resets a cursor from an empty channel once Redis may have trimmed or expired events", async () => {
    const { subscribe } = setup()
    redis.server.now = Date.now()
    const empty = await subscribe([{ channel: "demo", params: { userId: "user_1" } }])
    const [ready] = await empty.waitFor(1)
    empty.controller.abort()
    const cursor = z.parse(CursorData, ready?.data).cursor

    for (let index = 0; index < 100; index += 1) redis.append(REDIS_KEY, "greeted", greeting("hi"))
    const trimmed = await subscribe([{ channel: "demo", cursor, params: { userId: "user_1" } }])
    redis.server.streams.clear()
    redis.server.now += ms("1d")
    const expired = await subscribe([{ channel: "demo", cursor, params: { userId: "user_1" } }])

    const trimmedEvents = await trimmed.waitFor(1)
    const expiredEvents = await expired.waitFor(1)

    expect(trimmedEvents.map(({ type }) => type)).toEqual(["reset"])
    expect(expiredEvents.map(({ type }) => type)).toEqual(["reset"])
  })

  test("resets a cursor from a channel that received an event while it was found empty", async () => {
    const { subscribe } = setup()
    const startedAt = Date.now()
    redis.server.now = startedAt
    redis.server.beforeTime = () => {
      redis.server.beforeTime = undefined
      redis.append(REDIS_KEY, "greeted", greeting("between"))
      redis.server.now = startedAt + 100
    }
    const first = await subscribe([{ channel: "demo", params: { userId: "user_1" } }])
    const [ready] = await first.waitFor(1)
    first.controller.abort()

    redis.server.streams.clear()
    redis.server.now = startedAt + ms("1d") + 50
    const stream = await subscribe([
      {
        channel: "demo",
        cursor: z.parse(CursorData, ready?.data).cursor,
        params: { userId: "user_1" },
      },
    ])
    const events = await stream.waitFor(1)

    expect(events.map(({ type }) => type)).toEqual(["reset"])
  })

  test("denies a subscription without closing the stream", async () => {
    const { subscribe } = setup({ isAllowed: false })

    const stream = await subscribe([{ channel: "demo", params: { userId: "user_1" } }])

    expect(stream.response.status).toBe(200)
    expect(await stream.waitFor(1)).toEqual([{ data: { key: KEY }, type: "denied" }])
  })

  test("rejects a subscription to an unknown channel or with invalid params", async () => {
    const { subscribe } = setup()

    const unknown = await subscribe([{ channel: "missing", params: {} }])
    const invalid = await subscribe([{ channel: "demo", params: { userId: 1 } }])

    expect([unknown.response.status, invalid.response.status]).toEqual([400, 400])
  })

  test("closes open streams when the subscriber reconnects, so clients replay what they missed", async () => {
    const { subscribe } = setup()
    const stream = await subscribe([{ channel: "demo", params: { userId: "user_1" } }])
    await stream.waitFor(1)
    const [subscriber] = redis.server.subscribers

    subscriber?.emit("ready")
    subscriber?.emit("ready")

    await stream.closed

    expect(subscriber?.channels.size).toBe(0)
  })

  test("ends open streams on close, so the server can stop", async () => {
    const { channel, handler } = setup()
    const server = Bun.serve({ fetch: (request) => handler.handle(request), port: 0 })
    const response = await fetch(server.url, {
      body: JSON.stringify({ subscriptions: [{ channel: "demo", params: { userId: "user_1" } }] }),
      method: "POST",
    })
    const stream = readEvents(response.body)
    await stream.waitFor(1)

    const stopped = server.stop()
    handler.close()
    await stopped
    await stream.closed

    expect(await channel.emit("greeted", { message: "Hi" })).toEqual({ cursor: expect.any(String) })
  })

  test("refuses a stream whose authorization finishes after close", async () => {
    const realtime = createRealtime({ url: "redis://localhost:6379" })
    const authorization = Promise.withResolvers<boolean>()
    const handler = createRealtimeHandler({
      authorize: { demo: () => authorization.promise },
      realtime,
    })
    const server = Bun.serve({ fetch: (request) => handler.handle(request), port: 0 })
    const pending = fetch(server.url, {
      body: JSON.stringify({ subscriptions: [{ channel: "demo", params: { userId: "user_1" } }] }),
      method: "POST",
    })
    await Bun.sleep(20)

    const stopped = server.stop()
    handler.close()
    authorization.resolve(true)
    const response = await pending
    await stopped

    expect(response.status).toBe(503)
  })
})
