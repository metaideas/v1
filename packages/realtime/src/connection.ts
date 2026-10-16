import type { Logger } from "@v1/core/services/logging"
import * as z from "@v1/utils/schema/mini"
import { type EventSourceMessage, createParser } from "eventsource-parser"
import { ms } from "humanspan"
import type { ChannelName, ChannelParamsInput, RealtimeMessage } from "#catalog.ts"
import { getEvent, isEventName } from "#lookup.ts"
import {
  HEARTBEAT_INTERVAL_MS,
  type SubscribeRequest,
  ServerMessageSchemas,
  addressChannel,
  compareCursors,
} from "#protocol.ts"

// Mounting several hooks at once opens one stream instead of one per hook.
const CONNECT_DEBOUNCE_MS = 25
const RETRY_BASE_MS = ms("500ms")
const RETRY_MAX_MS = ms("30s")
// Missing three heartbeats in a row means the stream died without closing, such as when a laptop
// sleeps or a phone changes networks.
const STALE_AFTER_MS = HEARTBEAT_INTERVAL_MS * 3

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "denied"

/**
 * The part of `fetch` the connection uses. The global `fetch` satisfies it on the web, in Electron,
 * and in extensions. React Native's does not stream response bodies, so mobile passes `fetch` from
 * `expo/fetch`.
 */
type Fetch = (
  url: string,
  init: { body: string; headers: Record<string, string>; method: "POST"; signal: AbortSignal }
) => Promise<{ body: ReadableStream<Uint8Array> | null; ok: boolean; status: number }>

export type RealtimeClientOptions = {
  /**
   * URL of the realtime handler, such as `http://localhost:3000/realtime`.
   */
  endpoint: string
  /**
   * Returns an access token from the auth server, such as `authClient.token()` from
   * `@v1/auth/client`. The connection asks for a fresh token every time it connects.
   */
  getToken: () => Promise<string>
  fetch?: Fetch
  logger?: Logger
  /**
   * Calls `resume` when a dropped connection is worth retrying at once instead of after its
   * backoff, such as when the network returns or the app comes to the foreground. Returns a
   * function that stops listening. By default it listens to the browser's `online` and
   * `visibilitychange` events. On mobile, pass one built on `AppState`.
   */
  onResume?: (resume: () => void) => (() => void) | undefined
}

type Subscriber<Channel extends ChannelName> = {
  onMessage: (message: RealtimeMessage<Channel>) => void
  onReset?: () => void
}

/**
 * A subscriber with its channel erased, so subscriptions to different channels share one map.
 */
type Listener = {
  deliver: (message: { cursor: string; data: unknown; event: string }) => void
  onReset?: () => void
}

type Subscription = {
  channel: ChannelName
  listeners: Set<Listener>
  params: unknown
  cursor?: string
  isDenied?: boolean
}

function onBrowserResume(resume: () => void) {
  if (typeof document === "undefined" || typeof globalThis.addEventListener !== "function") return

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") resume()
  }

  globalThis.addEventListener("online", resume)
  document.addEventListener("visibilitychange", handleVisibilityChange)

  return () => {
    globalThis.removeEventListener("online", resume)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }
}

function getRetryDelay(attempt: number) {
  const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt)

  return delay / 2 + Math.random() * (delay / 2)
}

/**
 * Keeps one stream open to the realtime handler for every subscription in the app. It opens the
 * stream on the first subscription and closes it after the last. When the subscriptions change, it
 * reconnects with the cursor each channel reached, so no event is lost or delivered twice.
 */
export function createConnection({
  endpoint,
  fetch = (url, init) => globalThis.fetch(url, init),
  getToken,
  logger,
  onResume = onBrowserResume,
}: RealtimeClientOptions) {
  const subscriptions = new Map<string, Subscription>()
  const statusListeners = new Set<() => void>()
  let status: Exclude<ConnectionStatus, "denied"> = "disconnected"
  let attempt = 0
  let current: AbortController | undefined
  let connectTimer: ReturnType<typeof setTimeout> | undefined
  let staleTimer: ReturnType<typeof setTimeout> | undefined
  let stopResume: (() => void) | undefined

  function notify() {
    for (const listener of statusListeners) listener()
  }

  function setStatus(next: typeof status) {
    if (status === next) return

    status = next
    notify()
  }

  // An error in one application callback must not stop the others from receiving the event, or
  // turn into a reconnect, so each callback runs on its own and its error goes to the logger.
  function notifyListeners(subscription: Subscription, call: (listener: Listener) => void) {
    for (const listener of subscription.listeners) {
      try {
        call(listener)
      } catch (error) {
        logger?.error({ error, message: "Realtime callback failed", scope: "realtime" })
      }
    }
  }

  function scheduleConnect(delay: number) {
    clearTimeout(connectTimer)
    connectTimer = setTimeout(() => {
      void connect()
    }, delay)
  }

  function watchForStaleStream(controller: AbortController) {
    clearTimeout(staleTimer)
    staleTimer = setTimeout(() => {
      controller.abort()
    }, STALE_AFTER_MS)
  }

  function deliver({ cursor, data, event, key }: z.infer<typeof ServerMessageSchemas.message>) {
    const subscription = subscriptions.get(key)
    if (!subscription) return
    if (subscription.cursor && compareCursors(cursor, subscription.cursor) <= 0) return

    subscription.cursor = cursor
    notifyListeners(subscription, (listener) => {
      listener.deliver({ cursor, data, event })
    })
  }

  function handleEvent({ data, event }: EventSourceMessage) {
    // A successful message or acknowledgement shows the stream works, so the next drop retries
    // from the shortest delay.
    attempt = 0

    if (event === "message") {
      const message = z.safeParse(ServerMessageSchemas.message, JSON.parse(data))
      if (message.success) deliver(message.data)
      return
    }

    if (event === "ready" || event === "reset") {
      const message = z.safeParse(ServerMessageSchemas[event], JSON.parse(data))
      const subscription = message.success ? subscriptions.get(message.data.key) : undefined
      if (!message.success || !subscription) return

      subscription.cursor = message.data.cursor
      if (event === "reset") {
        notifyListeners(subscription, (listener) => {
          listener.onReset?.()
        })
      }
      return
    }

    if (event === "denied") {
      const message = z.safeParse(ServerMessageSchemas.denied, JSON.parse(data))
      const subscription = message.success ? subscriptions.get(message.data.key) : undefined
      if (!subscription) return

      subscription.isDenied = true
      notify()
    }
  }

  async function stream(controller: AbortController) {
    const body: SubscribeRequest = {
      subscriptions: [...subscriptions.values()].map(({ channel, cursor, params }) => ({
        channel,
        cursor,
        params,
      })),
    }
    const token = await getToken()
    // A connection that ended while it waited for the token must not open a stream, because no
    // transport is required to reject a signal that aborted before the request.
    controller.signal.throwIfAborted()
    const response = await fetch(endpoint, {
      body: JSON.stringify(body),
      headers: {
        accept: "text/event-stream",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      throw new Error(`The realtime stream responded with status ${response.status}`)
    }

    setStatus("connected")
    watchForStaleStream(controller)

    const parser = createParser({ onEvent: handleEvent })
    const decoder = new TextDecoder()
    const reader = response.body.getReader()

    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- A stream yields its chunks in order, one read at a time.
      const { done, value } = await reader.read()
      if (done) return

      watchForStaleStream(controller)
      parser.feed(decoder.decode(value, { stream: true }))
    }
  }

  async function connect() {
    clearTimeout(connectTimer)
    clearTimeout(staleTimer)
    current?.abort()
    current = undefined

    if (subscriptions.size === 0) {
      stopResume?.()
      stopResume = undefined
      setStatus("disconnected")
      return
    }

    const controller = new AbortController()
    current = controller
    stopResume ??= onResume(resume)
    for (const subscription of subscriptions.values()) subscription.isDenied = false
    setStatus("connecting")

    try {
      await stream(controller)
    } catch (error) {
      if (current === controller && !controller.signal.aborted) {
        logger?.warn({ error, message: "Realtime stream failed", scope: "realtime" })
      }
    }

    // A newer connection replaced this one, or the last subscription ended.
    if (current !== controller) return

    clearTimeout(staleTimer)
    setStatus("disconnected")
    scheduleConnect(getRetryDelay(attempt))
    attempt += 1
  }

  function resume() {
    if (status === "disconnected" && subscriptions.size > 0) void connect()
  }

  /**
   * Subscribes to one instance of a channel until the returned function runs. Subscribers to the
   * same instance share its place in the stream.
   */
  function subscribe<Channel extends ChannelName>(
    channel: Channel,
    params: ChannelParamsInput<Channel>,
    { onMessage, onReset }: Subscriber<Channel>
  ) {
    const address = addressChannel(channel, params)
    if ("error" in address) {
      throw new Error(`The params do not match the "${channel}" channel`, { cause: address.error })
    }

    const listener: Listener = {
      deliver: ({ cursor, data, event }) => {
        if (!isEventName(channel, event)) {
          logger?.warn({ channel, event, message: "Unknown realtime event", scope: "realtime" })
          return
        }

        const decoded = getEvent(channel, event).safeParse(data)
        if (!decoded.success) {
          logger?.warn({
            channel,
            error: decoded.error,
            event,
            message: "Realtime event does not match its schema",
            scope: "realtime",
          })
          return
        }

        onMessage({ channel, cursor, data: decoded.data, event })
      },
      onReset,
    }

    const existing = subscriptions.get(address.key)
    if (existing) {
      existing.listeners.add(listener)
    } else {
      subscriptions.set(address.key, { channel, listeners: new Set([listener]), params })
      scheduleConnect(CONNECT_DEBOUNCE_MS)
    }

    return () => {
      const subscription = subscriptions.get(address.key)
      subscription?.listeners.delete(listener)
      if (!subscription || subscription.listeners.size > 0) return

      subscriptions.delete(address.key)
      scheduleConnect(CONNECT_DEBOUNCE_MS)
    }
  }

  function getStatus(key: string | undefined): ConnectionStatus {
    if (key === undefined) return "disconnected"

    return subscriptions.get(key)?.isDenied ? "denied" : status
  }

  function subscribeToStatus(listener: () => void) {
    statusListeners.add(listener)

    return () => {
      statusListeners.delete(listener)
    }
  }

  return { getStatus, subscribe, subscribeToStatus }
}

export type Connection = ReturnType<typeof createConnection>
