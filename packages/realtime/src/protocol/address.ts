import * as z from "@v1/utils/schema/mini"
import type { ChannelName } from "#channels/catalog.ts"
import { getChannel } from "#channels/lookup.ts"

export function compareCursors(left: string, right: string) {
  const [leftTime = 0, leftSequence = 0] = left.split("-").map(Number)
  const [rightTime = 0, rightSequence = 0] = right.split("-").map(Number)

  return leftTime - rightTime || leftSequence - rightSequence
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item))
  if (typeof value !== "object" || value === null) return value

  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => (left < right ? -1 : 1))
      .map(([key, entry]) => [key, sortKeys(entry)])
  )
}

/**
 * Parses a channel's params and names the instance they address. The same params give the same key
 * on the server and every client, whatever the order of their keys.
 */
export function addressChannel<Channel extends ChannelName>(channel: Channel, params: unknown) {
  const parsed = z.safeParse(getChannel(channel).params, params)
  if (!parsed.success) return { error: parsed.error }

  return { key: `${channel}:${JSON.stringify(sortKeys(parsed.data))}`, params: parsed.data }
}
