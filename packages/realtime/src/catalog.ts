import type * as z from "@v1/utils/schema/mini"
import { demo } from "#channels/demo.ts"

/**
 * Every channel, one file per channel. A channel's name is its key here.
 */
export const channels = { demo }

type Channels = typeof channels

export type ChannelName = keyof Channels

/**
 * What a caller passes to address a channel, before its schema parses it.
 */
export type ChannelParamsInput<Channel extends ChannelName> = z.input<Channels[Channel]["params"]>

/**
 * The params that address a channel, after its schema parses them.
 */
export type ChannelParams<Channel extends ChannelName> = z.output<Channels[Channel]["params"]>

export type EventName<Channel extends ChannelName> = keyof Channels[Channel]["events"] & string

/**
 * An event's data as both the emitter and the subscriber see it, after its schema decodes it.
 */
export type EventData<Channel extends ChannelName, Event extends EventName<Channel>> = z.output<
  Channels[Channel]["events"][Event]
>

/**
 * An event's data as it travels through Redis and the stream, after its schema encodes it.
 */
export type EncodedEventData<
  Channel extends ChannelName,
  Event extends EventName<Channel>,
> = z.input<Channels[Channel]["events"][Event]>

/**
 * One event on a channel. A union of every event in `Event`, so checking `event` narrows `data`.
 */
export type RealtimeMessage<
  Channel extends ChannelName,
  Event extends EventName<Channel> = EventName<Channel>,
> = {
  [Name in Event]: { channel: Channel; cursor: string; data: EventData<Channel, Name>; event: Name }
}[Event]
