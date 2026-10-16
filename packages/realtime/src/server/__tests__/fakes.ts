import { mock } from "bun:test"
import { createParser } from "eventsource-parser"
import { waitUntil } from "#__tests__/wait-until.ts"
import { compareCursors } from "#protocol/address.ts"

type Handler = (...args: string[]) => void

type FakeClient = ReturnType<typeof createClient>

type FakeServer = {
  streams: Map<string, Array<[string, string[]]>>
  subscribers: Set<FakeClient>
  sequence: number
  /**
   * The server clock in milliseconds. Defaults to the real one.
   */
  now?: number
  /**
   * Runs before each history read, such as to publish an event while a subscription catches up.
   */
  beforeRead?: () => void
  /**
   * Fails the next emit, as Redis does while it is unreachable.
   */
  emitError?: Error
}

/**
 * Shared by every fake client, as one Redis server is.
 */
const server: FakeServer = { sequence: 0, streams: new Map(), subscribers: new Set() }

function append(key: string, event: string, data: string) {
  server.sequence += 1
  const cursor = `${server.sequence}-0`
  const entry: [string, string[]] = [cursor, ["event", event, "data", data]]
  server.streams.set(key, [...(server.streams.get(key) ?? []), entry])

  for (const subscriber of server.subscribers) {
    if (subscriber.channels.has(key))
      subscriber.emit("message", key, `${cursor}\n${event}\n${data}`)
  }

  return cursor
}

function createClient() {
  const handlers = new Map<string, Handler[]>()
  const channels = new Set<string>()

  const client = {
    channels,
    disconnect: mock(),
    status: "ready",

    duplicate() {
      const subscriber = createClient()
      server.subscribers.add(subscriber)
      return subscriber
    },

    emit(event: string, ...args: string[]) {
      for (const handler of handlers.get(event) ?? []) handler(...args)
    },

    eval(_script: string, _keys: number, key: string, ...args: Array<string | number>) {
      const error = server.emitError
      server.emitError = undefined
      if (error) return Promise.reject(error)

      return Promise.resolve(append(key, String(args[2]), String(args[3])))
    },

    on(event: string, handler: Handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler])
      return client
    },

    quit: () => Promise.resolve("OK"),

    time() {
      const now = server.now ?? Date.now()
      return Promise.resolve([String(Math.floor(now / 1000)), String((now % 1000) * 1000)])
    },

    subscribe(key: string) {
      channels.add(key)
      return Promise.resolve(channels.size)
    },

    unsubscribe(key: string) {
      channels.delete(key)
      return Promise.resolve(channels.size)
    },

    xrange(key: string, start: string) {
      server.beforeRead?.()
      const stream = server.streams.get(key) ?? []

      return Promise.resolve(stream.filter(([cursor]) => compareCursors(cursor, start) >= 0))
    },

    xrevrange: (key: string) => Promise.resolve((server.streams.get(key) ?? []).slice(-1)),
  }

  return client
}

/**
 * Replaces `ioredis` with an in-memory stand-in for the commands the package uses: streams, the
 * emit script, and pub/sub. Bun shares module mocks across test files.
 */
export async function mockRedis() {
  await mock.module("ioredis", () => ({ Redis: mock(() => createClient()) }))

  return {
    append,
    reset() {
      server.beforeRead = undefined
      server.emitError = undefined
      server.now = undefined
      server.streams.clear()
      server.subscribers.clear()
    },
    server,
  }
}

/**
 * Reads a server-sent event stream as it arrives.
 */
export function readEvents(body: ReadableStream<Uint8Array> | null) {
  const events: Array<{ data: unknown; type: string }> = []
  const decoder = new TextDecoder()
  const parser = createParser({
    onEvent: ({ data, event }) => {
      events.push({ data: JSON.parse(data), type: event ?? "message" })
    },
  })

  return {
    /**
     * Resolves once the server closes the stream.
     */
    closed: body?.pipeTo(
      new WritableStream({
        write: (chunk) => {
          parser.feed(decoder.decode(chunk, { stream: true }))
        },
      })
    ),
    events,
    async waitFor(count: number) {
      await waitUntil(() => events.length >= count)
      return events
    },
  }
}
