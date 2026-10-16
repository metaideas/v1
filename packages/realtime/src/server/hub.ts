import type { Logger } from "@v1/core/services/logging"
import type { Redis } from "ioredis"
import { type StreamEntry, parsePublished } from "#server/redis.ts"

export type Listener = (entry: StreamEntry) => void

/**
 * Shares one Redis subscriber connection between every stream in the process, subscribing to a
 * channel while at least one stream listens to it.
 */
export function createHub({ connection, logger }: { connection: Redis; logger?: Logger }) {
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
    // Redis drops what it publishes while the subscriber is away, so a reconnect closes every
    // stream and its client resumes from its cursor.
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

  return {
    /**
     * Calls `listener` with each event published to the key. Resolves once Redis confirms the
     * subscription.
     */
    async join(key: string, listener: Listener) {
      const existing = subscriptions.get(key)
      if (existing) {
        existing.listeners.add(listener)
        return existing.subscribed
      }

      const subscribed = openSubscriber().subscribe(key)
      subscriptions.set(key, { listeners: new Set([listener]), subscribed })

      return subscribed
    },

    leave(key: string, listener: Listener) {
      const subscription = subscriptions.get(key)
      if (!subscription) return

      subscription.listeners.delete(listener)
      if (subscription.listeners.size > 0) return

      subscriptions.delete(key)
      subscriber?.unsubscribe(key).catch((error: unknown) => {
        logger?.debug({ error, key, message: "Realtime unsubscribe failed", scope: "realtime" })
      })
    },

    /**
     * Registers a stream's `close`, which runs when the subscriber reconnects or the hub closes.
     * Returns a function that unregisters it.
     */
    track(close: () => void) {
      streams.add(close)
      return () => {
        streams.delete(close)
      }
    },

    async close() {
      for (const close of streams) close()

      if (subscriber?.status === "ready") await subscriber.quit()
      else subscriber?.disconnect()
    },
  }
}

export type Hub = ReturnType<typeof createHub>
