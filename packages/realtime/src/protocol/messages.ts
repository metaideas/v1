import { ms } from "@sanely/duration"
import * as z from "@v1/utils/schema/mini"

/**
 * The server writes a comment this often, so proxies keep the stream open and clients notice a dead
 * connection. Node's HTTP server does not close an idle response stream, so proxies set the limit.
 */
export const HEARTBEAT_INTERVAL_MS = ms("8s")

export const MAX_SUBSCRIPTIONS = 50

/**
 * A Redis stream entry ID. Stream IDs only grow, so a cursor orders the events of one channel.
 */
export const CursorSchema = z.string().check(z.regex(/^\d+-\d+$/))

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

/**
 * The data of one SSE event type, as the server writes it.
 */
export type ServerMessage<Type extends ServerMessageType> = z.input<
  (typeof ServerMessageSchemas)[Type]
>
