import type * as z from "@v1/utils/schema/mini"
import type { TimeExpression } from "humanspan"
import {
  type ChannelName,
  type ChannelParams,
  type ChannelParamsInput,
  type EncodedEventData,
  type EventData,
  type EventName,
  channels,
} from "#catalog.ts"

// Indexing this mapped view with generic names keeps a schema's types tied to its channel and
// event, which indexing `channels` directly does not.
const catalog: {
  [Channel in ChannelName]: {
    events: {
      [Event in EventName<Channel>]: z.ZodMiniType<
        EventData<Channel, Event>,
        EncodedEventData<Channel, Event>
      >
    }
    params: z.ZodMiniType<ChannelParams<Channel>, ChannelParamsInput<Channel>>
    history?: { expireAfter: TimeExpression; maxLength: number }
  }
} = channels

export function isChannelName(name: string): name is ChannelName {
  return Object.hasOwn(channels, name)
}

export function getChannel<Channel extends ChannelName>(channel: Channel) {
  return catalog[channel]
}

export function getEvent<Channel extends ChannelName, Event extends EventName<Channel>>(
  channel: Channel,
  event: Event
): z.ZodMiniType<EventData<Channel, Event>, EncodedEventData<Channel, Event>> {
  return catalog[channel].events[event]
}

export function isEventName<Channel extends ChannelName>(
  channel: Channel,
  event: string
): event is EventName<Channel> {
  return Object.hasOwn(catalog[channel].events, event)
}
