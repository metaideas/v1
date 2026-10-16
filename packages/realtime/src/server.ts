import type { Logger } from "@v1/core/services/logging"
import { PublishEventError, RealtimeFault, type RealtimePayloadError } from "@v1/core/errors"
import * as z from "@v1/utils/schema/mini"
import { ms } from "humanspan"
import { Redis } from "ioredis"
import * as try$ from "tryharder"
import type {
  ChannelName,
  ChannelParams,
  ChannelParamsInput,
  EventData,
  EventName,
} from "#catalog.ts"
import { getChannel, getEvent, isChannelName } from "#lookup.ts"
import {
  HEARTBEAT_INTERVAL_MS,
  type ServerMessageType,
  SubscribeRequestSchema,
  addressChannel,
  compareCursors,
} from "#protocol.ts"

const DEFAULT_HISTORY = { expireAfter: "1d", maxLength: 100 } as const

// Appends the event to the channel's stream and publishes it in one atomic step, so subscribers
// receive events in the order the stream holds them. A published message is the cursor, the event,
// and the data, separated by newlines. JSON data never contains a raw newline.
const EMIT_SCRIPT = `
local cursor = redis.call("XADD", KEYS[1], "MAXLEN", "~", ARGV[1], "*", "event", ARGV[3], "data", ARGV[4])
redis.call("PEXPIRE", KEYS[1], ARGV[2])
redis.call("PUBLISH", KEYS[1], cursor .. "\\n" .. ARGV[3] .. "\\n" .. ARGV[4])
return cursor
`

type StreamEntry = { cursor: string; data: unknown; event: string }

type Listener = (entry: StreamEntry) => void

type RealtimeInternals = {
  connection: Redis
  join: (key: string, listener: Listener) => Promise<unknown>
  leave: (key: string, listener: Listener) => void
  logger?: Logger
  /**
   * Closes every open stream when the subscriber reconnects, so clients replay what Redis did not
   * deliver while it was down.
   */
  streams: Set<() => void>
}

const internals = new WeakMap<object, RealtimeInternals>()

function toRedisKey(key: string) {
  return `realtime:${key}`
}

function parsePublished(message: string): StreamEntry | undefined {
  const cursorEnd = message.indexOf("\n")
  const eventEnd = message.indexOf("\n", cursorEnd + 1)
  if (cursorEnd === -1 || eventEnd === -1) return undefined

  return {
    cursor: message.slice(0, cursorEnd),
    data: JSON.parse(message.slice(eventEnd + 1)),
    event: message.slice(cursorEnd + 1, eventEnd),
  }
}

function parseStored([cursor, fields]: [string, string[]]): StreamEntry {
  const event = fields[fields.indexOf("event") + 1] ?? ""
  const data = fields[fields.indexOf("data") + 1] ?? "null"

  return { cursor, data: JSON.parse(data), event }
}

/**
 * Builds the realtime service. Every server process that emits events builds one, and the API
 * passes it to `createRealtimeHandler` to stream events to clients. Close it on shutdown.
 */
export function createRealtime({ logger, url }: RealtimeOptions) {
  // An emit waits while the connection opens, but fails after one reconnect attempt while Redis is
  // unreachable instead of holding the request open until Redis returns.
  const connection = new Redis(url, { maxRetriesPerRequest: 1 })
  connection.on("error", (error) => {
    logger?.error({ error, message: "Realtime connection error", scope: "realtime" })
  })

  const subscriptions = new Map<
    string,
    { listeners: Set<Listener>; subscribed: Promise<unknown> }
  >()
  const streams = new Set<() => void>()
  let subscriber: Redis | undefined

  // Opens on the first subscription, so a process that only emits, such as a worker, never holds a
  // subscriber connection.
  function openSubscriber() {
    if (subscriber) return subscriber

    let hasConnected = false
    subscriber = connection.duplicate({ maxRetriesPerRequest: null })
    subscriber.on("error", (error) => {
      logger?.error({ error, message: "Realtime subscriber error", scope: "realtime" })
    })
    subscriber.on("ready", () => {
      if (hasConnected) {
        for (const close of streams) close()
      }
      hasConnected = true
    })
    subscriber.on("message", (key: string, message: string) => {
      const entry = parsePublished(message)
      if (!entry) return

      for (const listener of subscriptions.get(key)?.listeners ?? []) listener(entry)
    })

    return subscriber
  }

  async function join(key: string, listener: Listener) {
    const existing = subscriptions.get(key)
    if (existing) {
      existing.listeners.add(listener)
      return existing.subscribed
    }

    const subscribed = openSubscriber().subscribe(key)
    subscriptions.set(key, { listeners: new Set([listener]), subscribed })

    return subscribed
  }

  function leave(key: string, listener: Listener) {
    const subscription = subscriptions.get(key)
    if (!subscription) return

    subscription.listeners.delete(listener)
    if (subscription.listeners.size > 0) return

    subscriptions.delete(key)
    subscriber?.unsubscribe(key).catch((error: unknown) => {
      logger?.debug({ error, key, message: "Realtime unsubscribe failed", scope: "realtime" })
    })
  }

  const realtime = {
    /**
     * Addresses one instance of a channel, such as a user's notifications.
     */
    channel<Channel extends ChannelName>(channel: Channel, params: ChannelParamsInput<Channel>) {
      return {
        /**
         * Validates and encodes the data, then appends the event to the channel's history and
         * publishes it to every subscriber. A failed emit comes back as a value instead of
         * throwing.
         */
        async emit<Event extends EventName<Channel>>(
          event: Event,
          data: EventData<Channel, Event>
        ): Promise<{ cursor: string } | PublishEventError | RealtimePayloadError> {
          const address = addressChannel(channel, params)
          const encoded = z.safeEncode(getEvent(channel, event), data)

          if ("error" in address || !encoded.success) {
            const cause = "error" in address ? address.error : encoded.error
            const error = RealtimeFault.wrap(cause).as("RealtimePayloadError", {
              channel,
              event,
            })
            logger?.error({ channel, error, event, message: "Event is invalid", scope: "realtime" })

            return error
          }

          const { expireAfter, maxLength } = getChannel(channel).history ?? DEFAULT_HISTORY
          const result = await try$.run({
            catch: (error) => RealtimeFault.wrap(error).as("PublishEventError", { channel, event }),
            try: () =>
              connection.eval(
                EMIT_SCRIPT,
                1,
                toRedisKey(address.key),
                maxLength,
                ms(expireAfter),
                event,
                JSON.stringify(encoded.data)
              ),
          })

          if (result instanceof PublishEventError) {
            logger?.error({
              channel,
              error: result,
              event,
              message: "Event publish failed",
              scope: "realtime",
            })

            return result
          }

          return { cursor: String(result) }
        },
      }
    },

    async close() {
      for (const close of streams) close()

      await Promise.all(
        [connection, subscriber].map(async (client) => {
          if (client?.status === "ready") await client.quit()
          else client?.disconnect()
        })
      )
    },
  }

  internals.set(realtime, { connection, join, leave, logger, streams })

  return realtime
}

export type Realtime = ReturnType<typeof createRealtime>

type RealtimeOptions = {
  url: string
  logger?: Logger
}

/**
 * Decides whether the request can subscribe to one instance of a channel.
 */
type Authorize<Channel extends ChannelName> = (input: {
  params: ChannelParams<Channel>
  request: Request
}) => boolean | Promise<boolean>

type RealtimeHandlerOptions = {
  /**
   * An authorization rule for every channel. Adding a channel fails type checking in each handler
   * until it decides who can subscribe.
   */
  authorize: { [Channel in ChannelName]: Authorize<Channel> }
  realtime: Realtime
}

function getAuthorize<Channel extends ChannelName>(
  authorize: RealtimeHandlerOptions["authorize"],
  channel: Channel
): Authorize<Channel> {
  return authorize[channel]
}

function invalid(message: string) {
  return Response.json({ message }, { status: 400 })
}

/**
 * Streams events to clients over server-sent events. A request lists the channels it subscribes to
 * and the cursor each one reached. The handler replays the events after each cursor that Redis
 * still holds, then streams new events as they arrive. It uses only web standards, so it runs on
 * any server that takes a `Request` and returns a `Response`, on Bun or Node.
 */
export function createRealtimeHandler({ authorize, realtime }: RealtimeHandlerOptions) {
  const runtime = internals.get(realtime)
  if (!runtime) throw new Error("createRealtimeHandler needs a service from createRealtime")

  const { connection, join, leave, logger, streams } = runtime
  // The streams this handler serves, so `close` ends them without closing the service.
  const served = new Set<() => void>()

  async function now() {
    const [seconds, microseconds] = await connection.time()
    return Number(seconds) * 1000 + Math.floor(Number(microseconds) / 1000)
  }

  // A channel without events starts at `0-<Redis time in ms>`. It comes before every event, and it
  // records when the client found the channel empty.
  async function tail(redisKey: string) {
    const [last] = await connection.xrevrange(redisKey, "+", "-", "COUNT", 1)
    return last?.[0] ?? `0-${await now()}`
  }

  // Whether Redis still holds every event after the cursor.
  async function isCursorKept(channel: ChannelName, cursor: string, history: StreamEntry[]) {
    const [time, emptySince = 0] = cursor.split("-").map(Number)
    if (time !== 0) return history[0]?.cursor === cursor

    // The channel was empty at the cursor, so the history holds every event since, unless Redis
    // trimmed or expired some. Trimming never leaves fewer than `maxLength` events, and the stream
    // expires `expireAfter` after its last event, which came after the cursor.
    const { expireAfter, maxLength } = getChannel(channel).history ?? DEFAULT_HISTORY
    return history.length < maxLength && (await now()) - emptySince < ms(expireAfter)
  }

  return {
    async handle(request: Request) {
      const body = z.safeParse(SubscribeRequestSchema, await request.json().catch(() => null))
      if (!body.success) return invalid("The subscription request is invalid")

      const addresses = []
      for (const { channel, cursor, params } of body.data.subscriptions) {
        if (!isChannelName(channel)) return invalid(`The channel "${channel}" does not exist`)

        const address = addressChannel(channel, params)
        if ("error" in address) return invalid(`The params do not match the "${channel}" channel`)

        addresses.push({ ...address, channel, cursor })
      }

      const subscriptions = new Map(
        await Promise.all(
          addresses.map(async ({ channel, cursor, key, params }) => {
            const isAllowed = await getAuthorize(authorize, channel)({ params, request })
            return [key, { channel, cursor, isAllowed, key }] as const
          })
        )
      )
      const encoder = new TextEncoder()
      let stop: ((isCancelled: boolean) => void) | undefined

      const stream = new ReadableStream<Uint8Array>({
        cancel() {
          stop?.(true)
        },
        start(controller) {
          const joined: Array<[string, Listener]> = []
          let isClosed = false

          function write(chunk: string) {
            if (!isClosed) controller.enqueue(encoder.encode(chunk))
          }

          function send(type: ServerMessageType, message: Record<string, unknown>) {
            write(`event: ${type}\ndata: ${JSON.stringify(message)}\n\n`)
          }

          function close(isCancelled = false) {
            if (isClosed) return
            isClosed = true

            clearInterval(heartbeat)
            streams.delete(handleInterruption)
            served.delete(handleInterruption)
            request.signal.removeEventListener("abort", handleAbort)
            for (const [key, listener] of joined) leave(key, listener)
            if (!isCancelled) controller.close()
          }

          function handleInterruption() {
            close()
          }

          function handleAbort() {
            close(true)
          }

          async function follow({
            channel,
            cursor,
            key,
          }: {
            channel: ChannelName
            cursor?: string
            key: string
          }) {
            const redisKey = toRedisKey(key)
            const buffered: StreamEntry[] = []
            let last: string | undefined

            function deliver(entry: StreamEntry) {
              if (last !== undefined && compareCursors(entry.cursor, last) <= 0) return

              last = entry.cursor
              send("message", { ...entry, key })
            }

            // Joining before reading the history buffers the events published meanwhile, so none
            // falls between the history and the live stream.
            const listener: Listener = (entry) => {
              if (last === undefined) buffered.push(entry)
              else deliver(entry)
            }
            joined.push([redisKey, listener])
            await join(redisKey, listener)

            if (cursor === undefined) {
              last = await tail(redisKey)
              send("ready", { cursor: last, key })
            } else {
              const stored = await connection.xrange(redisKey, cursor, "+")
              const history = stored.map((entry) => parseStored(entry))
              if (await isCursorKept(channel, cursor, history)) {
                last = cursor
                for (const entry of history) deliver(entry)
                send("ready", { cursor: last, key })
              } else {
                last = await tail(redisKey)
                send("reset", { cursor: last, key })
              }
            }

            for (const entry of buffered) deliver(entry)
          }

          const heartbeat = setInterval(() => {
            write(": ping\n\n")
          }, HEARTBEAT_INTERVAL_MS)

          stop = close
          streams.add(handleInterruption)
          served.add(handleInterruption)
          request.signal.addEventListener("abort", handleAbort)
          write(": connected\n\n")

          for (const { isAllowed, key } of subscriptions.values()) {
            if (!isAllowed) send("denied", { key })
          }

          Promise.all(
            [...subscriptions.values()]
              .filter(({ isAllowed }) => isAllowed)
              .map((subscription) => follow(subscription))
          ).catch((error: unknown) => {
            logger?.error({ error, message: "Realtime stream failed", scope: "realtime" })
            close()
          })
        },
      })

      return new Response(stream, {
        headers: {
          "cache-control": "no-cache, no-transform",
          "content-type": "text/event-stream; charset=utf-8",
          // Stops nginx and similar proxies from buffering the stream.
          "x-accel-buffering": "no",
        },
      })
    },

    /**
     * Ends every stream the handler serves, which never finish on their own. Call it once the
     * server stops taking requests, so the server can finish the rest.
     */
    close() {
      for (const close of served) close()
    },
  }
}

export type { ChannelName, ChannelParams, EventData, EventName } from "#catalog.ts"
