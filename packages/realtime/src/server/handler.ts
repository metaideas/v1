import * as z from "@v1/utils/schema/mini"
import { ms } from "humanspan"
import type { ChannelName, ChannelParams } from "#channels/catalog.ts"
import type { Listener } from "#server/hub.ts"
import { getHistory, isChannelName } from "#channels/lookup.ts"
import { addressChannel, compareCursors } from "#protocol/address.ts"
import {
  HEARTBEAT_INTERVAL_MS,
  type ServerMessageType,
  SubscribeRequestSchema,
} from "#protocol/messages.ts"
import { type Realtime, getInternals } from "#server/realtime.ts"
import { type StreamEntry, parseStored, readTail, readTime, toRedisKey } from "#server/redis.ts"

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

function unavailable() {
  return Response.json({ message: "The realtime handler is shutting down" }, { status: 503 })
}

/**
 * Streams events to clients over server-sent events. A request lists the channels it subscribes to
 * and the cursor each one reached. The handler replays the events after each cursor that Redis
 * still holds, then streams new events as they arrive. It uses only web standards, so it runs on
 * any server that takes a `Request` and returns a `Response`, on Bun or Node.
 */
export function createRealtimeHandler({ authorize, realtime }: RealtimeHandlerOptions) {
  const { connection, hub, logger } = getInternals(realtime)
  // The streams this handler serves, so `close` ends them without closing the service.
  const served = new Set<() => void>()
  let isClosing = false

  // Whether Redis still holds every event after the cursor.
  async function isCursorKept(channel: ChannelName, cursor: string, history: StreamEntry[]) {
    const [time, emptySince = 0] = cursor.split("-").map(Number)
    if (time !== 0) return history[0]?.cursor === cursor

    // The channel was empty at the cursor, so the history holds every event since, unless Redis
    // trimmed or expired some. Trimming never leaves fewer than `maxLength` events, and the stream
    // expires `expireAfter` after its last event, which came after the cursor.
    const { expireAfter, maxLength } = getHistory(channel)
    return history.length < maxLength && (await readTime(connection)) - emptySince < ms(expireAfter)
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
      // A request that arrives after close, or was still parsing or authorizing when it ran, must not
      // open a stream, which would hold the server open after `close` ended the others.
      if (isClosing) return unavailable()

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
            untrack()
            served.delete(handleInterruption)
            request.signal.removeEventListener("abort", handleAbort)
            for (const [key, listener] of joined) hub.leave(key, listener)
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
            await hub.join(redisKey, listener)

            if (cursor === undefined) {
              last = await readTail(connection, redisKey)
              send("ready", { cursor: last, key })
            } else {
              const stored = await connection.xrange(redisKey, cursor, "+")
              const history = stored.map((entry) => parseStored(entry))
              if (await isCursorKept(channel, cursor, history)) {
                last = cursor
                for (const entry of history) deliver(entry)
                send("ready", { cursor: last, key })
              } else {
                last = await readTail(connection, redisKey)
                send("reset", { cursor: last, key })
              }
            }

            for (const entry of buffered) deliver(entry)
          }

          const heartbeat = setInterval(() => {
            write(": ping\n\n")
          }, HEARTBEAT_INTERVAL_MS)

          stop = close
          const untrack = hub.track(handleInterruption)
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
     * Ends every stream the handler serves, which never finish on their own, and refuses new ones.
     * Call it once the server stops taking requests, so the server can finish the rest.
     */
    close() {
      isClosing = true
      for (const close of served) close()
    },
  }
}
