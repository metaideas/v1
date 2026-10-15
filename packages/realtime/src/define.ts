import type * as z from "@v1/utils/schema/mini"
import type { TimeExpression } from "humanspan"

/**
 * Declares a channel: the params that address one instance of it, and the events it carries. An
 * event's name is its key in `events`, so a channel cannot list two events with the same name.
 */
export function defineChannel<
  Params extends z.ZodMiniObject,
  Events extends Record<string, z.ZodMiniType>,
>(channel: ChannelDefinition<Params, Events>) {
  return channel
}

type ChannelDefinition<
  Params extends z.ZodMiniObject,
  Events extends Record<string, z.ZodMiniType>,
> = {
  /**
   * Addresses one instance of the channel, such as `{ userId }`. Clients subscribe with the same
   * params, and the server authorizes them before it streams anything.
   */
  params: Params
  /**
   * Schemas for each event's data. A schema can be a codec, such as an ISO string that decodes to a
   * `Date`: the server encodes the data before it publishes it, and clients decode it.
   */
  events: Events
  /**
   * How much of the channel Redis keeps so a client can catch up after a reconnect. A client that
   * falls further behind gets `onReset` instead of the events it missed.
   */
  history?: { expireAfter: TimeExpression; maxLength: number }
}
