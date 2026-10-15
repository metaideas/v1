import { useEffect, useEffectEvent, useSyncExternalStore } from "react"
import type { ChannelName, ChannelParamsInput, EventName, RealtimeMessage } from "#catalog.ts"
import type { Connection } from "#connection.ts"
import { addressChannel } from "#protocol.ts"

export type UseRealtimeOptions<Channel extends ChannelName, Event extends EventName<Channel>> = {
  channel: Channel
  params: ChannelParamsInput<Channel>
  onData: (message: RealtimeMessage<Channel, Event>) => void
  /**
   * The events `onData` receives. Defaults to every event on the channel.
   */
  events?: readonly Event[]
  /**
   * Subscribes only while it is true, such as once the user signs in.
   */
  enabled?: boolean
  /**
   * Runs when the client missed events that the server no longer holds, such as after a long time
   * offline. Refetch the state the events would have changed.
   */
  onReset?: () => void
}

function getServerStatus() {
  return "disconnected" as const
}

export function useRealtime<Channel extends ChannelName, Event extends EventName<Channel>>(
  connection: Connection,
  options: UseRealtimeOptions<Channel, Event>
) {
  const address =
    options.enabled === false ? undefined : addressChannel(options.channel, options.params)
  const key = address && "key" in address ? address.key : undefined

  function isListed(message: RealtimeMessage<Channel>): message is RealtimeMessage<Channel, Event> {
    return options.events?.some((event) => event === message.event) ?? true
  }

  const handleMessage = useEffectEvent((message: RealtimeMessage<Channel>) => {
    if (isListed(message)) options.onData(message)
  })
  const handleReset = useEffectEvent(() => {
    options.onReset?.()
  })
  const subscribe = useEffectEvent(() =>
    connection.subscribe(options.channel, options.params, {
      onMessage: handleMessage,
      onReset: handleReset,
    })
  )

  useEffect(() => (key === undefined ? undefined : subscribe()), [key])

  const status = useSyncExternalStore(
    connection.subscribeToStatus,
    () => connection.getStatus(key),
    getServerStatus
  )

  return { status }
}
