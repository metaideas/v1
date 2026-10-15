import * as z from "@v1/utils/schema/mini"
import { ms } from "humanspan"
import type { ChannelName } from "#catalog.ts"
import { getChannel } from "#lookup.ts"

/**
 * The server writes a comment this often, so servers and proxies keep the stream open and clients
 * notice a dead connection. It stays under the 10-second default `idleTimeout` of `Bun.serve`.
 */
export const HEARTBEAT_INTERVAL_MS = ms("8s")

export const MAX_SUBSCRIPTIONS = 50

/**
 * Where a channel starts before it has any events. Every event comes after it.
 */
export const INITIAL_CURSOR = "0-0"

/**
 * A Redis stream entry ID. Stream IDs only grow, so a cursor orders the events of one channel.
 */
const CursorSchema = z.string().check(z.regex(/^\d+-\d+$/))

export const SubscribeRequestSchema = z.object({
  subscriptions: z
    .array(
      z.object({
        channel: z.string(),
        cursor: z.optional(CursorSchema),
        params: z.unknown(),
      })
    )
    .check(z.minLength(1), z.maxLength(MAX_SUBSCRIPTIONS)),
})

export type SubscribeRequest = z.infer<typeof SubscribeRequestSchema>

/**
 * What the server streams, by SSE event type. `key` names the channel instance, as `channelKey`
 * builds it.
 */
export const ServerMessageSchemas = {
  /**
   * The client cannot subscribe to the channel. The rest of the stream continues.
   */
  denied: z.object({ key: z.string() }),
  message: z.object({
    cursor: CursorSchema,
    data: z.unknown(),
    event: z.string(),
    key: z.string(),
  }),
  /**
   * The channel caught up. Events after `cursor` follow live.
   */
  ready: z.object({ cursor: CursorSchema, key: z.string() }),
  /**
   * Redis no longer holds the events after the client's cursor, so the client missed some. Events
   * after `cursor` follow live.
   */
  reset: z.object({ cursor: CursorSchema, key: z.string() }),
}

export type ServerMessageType = keyof typeof ServerMessageSchemas

export function compareCursors(left: string, right: string) {
  const [leftTime = 0, leftSequence = 0] = left.split("-").map(Number)
  const [rightTime = 0, rightSequence = 0] = right.split("-").map(Number)

  return leftTime - rightTime || leftSequence - rightSequence
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item))
  if (typeof value !== "object" || value === null) return value

  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => (left < right ? -1 : 1))
      .map(([key, entry]) => [key, sortKeys(entry)])
  )
}

/**
 * Parses a channel's params and names the instance they address. The same params give the same key
 * on the server and every client, whatever the order of their keys.
 */
export function addressChannel<Channel extends ChannelName>(channel: Channel, params: unknown) {
  const parsed = z.safeParse(getChannel(channel).params, params)
  if (!parsed.success) return { error: parsed.error }

  return { key: `${channel}:${JSON.stringify(sortKeys(parsed.data))}`, params: parsed.data }
}
