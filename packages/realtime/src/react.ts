import type { ChannelName, EventName } from "#channels/catalog.ts"
import { type RealtimeClientOptions, createConnection } from "#client/connection.ts"
import {
  type UseRealtimeOptions,
  useRealtime as useConnectedRealtime,
} from "#client/use-realtime.ts"

/**
 * Builds the realtime hook for an app. An application calls it once in a `shared` module and
 * imports the hook from there. Every hook in the app shares one stream to the realtime handler.
 */
export function createRealtimeClient(options: RealtimeClientOptions) {
  const connection = createConnection(options)

  /**
   * Subscribes the component to one instance of a channel while it is mounted. `onData` receives
   * each event in `events` as it happens, with `data` typed by the event's name.
   */
  function useRealtime<
    Channel extends ChannelName,
    const Event extends EventName<Channel> = EventName<Channel>,
  >(hookOptions: UseRealtimeOptions<Channel, Event>) {
    return useConnectedRealtime(connection, hookOptions)
  }

  return { useRealtime }
}

export type { ChannelName, EventName, RealtimeMessage } from "#channels/catalog.ts"
export type { ConnectionStatus } from "#client/connection.ts"
