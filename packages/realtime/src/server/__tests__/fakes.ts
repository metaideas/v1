import { mock } from "bun:test"
import { createParser } from "eventsource-parser"
import { waitUntil } from "#__tests__/wait-until.ts"
import { compareCursors } from "#protocol/address.ts"

type Handler = () => void

type Listener = (message: string) => void

type FakeClient = ReturnType<typeof createClient>

type FakeServer = {
  streams: Map<string, Array<{ id: string; message: Record<string, string> }>>
  subscribers: Set<FakeClient>
  sequence: number
  /**
   * The server clock in milliseconds. Defaults to the real one.
   */
  now?: number
  /**
   * Runs before each time read, such as to emit an event while a subscription starts.
   */
  beforeTime?: () => void
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
  const entry = { id: cursor, message: { data, event } }
  server.streams.set(key, [...(server.streams.get(key) ?? []), entry])

  for (const subscriber of server.subscribers) {
    subscriber.channels.get(key)?.(`${cursor}\n${event}\n${data}`)
  }

  return cursor
}

function createClient() {
  const handlers = new Map<string, Handler[]>()
  const channels = new Map<string, Listener>()

  const client = {
    channels,
    close: () => Promise.resolve(),
    connect: () => Promise.resolve(client),
    destroy: mock(),
    isOpen: true,
    isReady: true,

    duplicate() {
      const subscriber = createClient()
      server.subscribers.add(subscriber)
      return subscriber
    },

    emit(event: string) {
      for (const handler of handlers.get(event) ?? []) handler()
    },

    eval(_script: string, { arguments: args, keys }: { arguments: string[]; keys: string[] }) {
      const error = server.emitError
      server.emitError = undefined
      if (error) return Promise.reject(error)

      return Promise.resolve(append(String(keys[0]), String(args[2]), String(args[3])))
    },

    on(event: string, handler: Handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler])
      return client
    },

    time() {
      server.beforeTime?.()
      const now = server.now ?? Date.now()
      return Promise.resolve([String(Math.floor(now / 1000)), String((now % 1000) * 1000)])
    },

    subscribe(key: string, listener: Listener) {
      channels.set(key, listener)
      return Promise.resolve()
    },

    unsubscribe(key: string) {
      channels.delete(key)
      return Promise.resolve()
    },

    xRange(key: string, start: string) {
      server.beforeRead?.()
      const stream = server.streams.get(key) ?? []

      return Promise.resolve(stream.filter(({ id }) => compareCursors(id, start) >= 0))
    },

    xRevRange: (key: string) => Promise.resolve((server.streams.get(key) ?? []).slice(-1)),
  }

  return client
}

/**
 * Replaces `redis` with an in-memory stand-in for the commands the package uses: streams, the emit
 * script, and pub/sub. Bun shares module mocks across test files.
 */
export async function mockRedis() {
  await mock.module("redis", () => ({ createClient: mock(() => createClient()) }))

  return {
    append,
    reset() {
      server.beforeRead = undefined
      server.emitError = undefined
      server.now = undefined
      server.beforeTime = undefined
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
