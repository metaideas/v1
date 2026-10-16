import type { Logger } from "@v1/core/services/logging"
import { PublishEventError, RealtimeFault, type RealtimePayloadError } from "@v1/core/errors"
import * as z from "@v1/utils/schema/mini"
import { ms } from "humanspan"
import { Redis } from "ioredis"
import * as try$ from "tryharder"
import type { ChannelName, ChannelParamsInput, EventData, EventName } from "#channels/catalog.ts"
import { getEvent, getHistory } from "#channels/lookup.ts"
import { addressChannel } from "#protocol/address.ts"
import { type Hub, createHub } from "#server/hub.ts"
import { EMIT_SCRIPT, toRedisKey } from "#server/redis.ts"

type RealtimeInternals = { connection: Redis; hub: Hub; logger?: Logger }

const internals = new WeakMap<object, RealtimeInternals>()

/**
 * The connection and hub behind a realtime service, for the handler that streams its events.
 */
export function getInternals(realtime: Realtime) {
  const runtime = internals.get(realtime)
  if (!runtime) throw new Error("Expected a service from createRealtime")

  return runtime
}

/**
 * Builds the realtime service. Every server process that emits events builds one, and the API
 * passes it to `createRealtimeHandler` to stream events to clients. Close it on shutdown.
 */
export function createRealtime({ logger, url }: RealtimeOptions) {
  // An emit waits while the connection opens, but fails after one reconnect attempt while Redis is
  // unreachable instead of holding the request open until Redis returns.
  const connection = new Redis(url, { maxRetriesPerRequest: 1 })
  connection.on("error", (error) => {
    logger?.error({ error, message: "Realtime connection error", scope: "realtime" })
  })

  const hub = createHub({ connection, logger })

  const realtime = {
    /**
     * Addresses one instance of a channel, such as a user's notifications.
     */
    channel<Channel extends ChannelName>(channel: Channel, params: ChannelParamsInput<Channel>) {
      return {
        /**
         * Validates and encodes the data, then appends the event to the channel's history and
         * publishes it to every subscriber. A failed emit comes back as a value instead of
         * throwing.
         */
        async emit<Event extends EventName<Channel>>(
          event: Event,
          data: EventData<Channel, Event>
        ): Promise<{ cursor: string } | PublishEventError | RealtimePayloadError> {
          const address = addressChannel(channel, params)
          const encoded = z.safeEncode(getEvent(channel, event), data)

          if ("error" in address || !encoded.success) {
            const cause = "error" in address ? address.error : encoded.error
            const error = RealtimeFault.wrap(cause).as("RealtimePayloadError", {
              channel,
              event,
            })
            logger?.error({ channel, error, event, message: "Event is invalid", scope: "realtime" })

            return error
          }

          const { expireAfter, maxLength } = getHistory(channel)
          const result = await try$.run({
            catch: (error) => RealtimeFault.wrap(error).as("PublishEventError", { channel, event }),
            try: () =>
              connection.eval(
                EMIT_SCRIPT,
                1,
                toRedisKey(address.key),
                maxLength,
                ms(expireAfter),
                event,
                JSON.stringify(encoded.data)
              ),
          })

          if (result instanceof PublishEventError) {
            logger?.error({
              channel,
              error: result,
              event,
              message: "Event publish failed",
              scope: "realtime",
            })

            return result
          }

          return { cursor: String(result) }
        },
      }
    },

    async close() {
      await hub.close()

      if (connection.status === "ready") await connection.quit()
      else connection.disconnect()
    },
  }

  internals.set(realtime, { connection, hub, logger })

  return realtime
}

export type Realtime = ReturnType<typeof createRealtime>

type RealtimeOptions = {
  url: string
  logger?: Logger
}
