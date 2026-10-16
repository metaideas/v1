import type { Redis } from "ioredis"

// Appends the event to the channel's stream and publishes it in one atomic step, so subscribers
// receive events in the order the stream holds them. A published message is the cursor, the event,
// and the data, separated by newlines. JSON data never contains a raw newline.
export const EMIT_SCRIPT = `
local cursor = redis.call("XADD", KEYS[1], "MAXLEN", "~", ARGV[1], "*", "event", ARGV[3], "data", ARGV[4])
redis.call("PEXPIRE", KEYS[1], ARGV[2])
redis.call("PUBLISH", KEYS[1], cursor .. "\\n" .. ARGV[3] .. "\\n" .. ARGV[4])
return cursor
`

/**
 * One event as Redis stores and publishes it.
 */
export type StreamEntry = { cursor: string; data: unknown; event: string }

/**
 * The Redis key of a channel instance's stream, which is also its pub/sub channel.
 */
export function toRedisKey(key: string) {
  return `realtime:${key}`
}

export function parsePublished(message: string): StreamEntry | undefined {
  const cursorEnd = message.indexOf("\n")
  const eventEnd = message.indexOf("\n", cursorEnd + 1)
  if (cursorEnd === -1 || eventEnd === -1) return undefined

  return {
    cursor: message.slice(0, cursorEnd),
    data: JSON.parse(message.slice(eventEnd + 1)),
    event: message.slice(cursorEnd + 1, eventEnd),
  }
}

export function parseStored([cursor, fields]: [string, string[]]): StreamEntry {
  const event = fields[fields.indexOf("event") + 1] ?? ""
  const data = fields[fields.indexOf("data") + 1] ?? "null"

  return { cursor, data: JSON.parse(data), event }
}

/**
 * Redis's clock in milliseconds, so every API process measures time the same way.
 */
export async function readTime(connection: Redis) {
  const [seconds, microseconds] = await connection.time()
  return Number(seconds) * 1000 + Math.floor(Number(microseconds) / 1000)
}

/**
 * The cursor of the channel's latest event. A channel without events starts at `0-<Redis time in
 * ms>`, which comes before every event and records when it was found empty.
 */
export async function readTail(connection: Redis, redisKey: string) {
  // Reading the time first keeps the checkpoint no later than the read that found the channel
  // empty, so an event emitted between the two commands never expires before the checkpoint does.
  const time = await readTime(connection)
  const [last] = await connection.xrevrange(redisKey, "+", "-", "COUNT", 1)
  return last?.[0] ?? `0-${time}`
}
