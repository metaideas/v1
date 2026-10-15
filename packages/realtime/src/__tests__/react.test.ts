import { describe, expectTypeOf, test } from "bun:test"
import { createRealtimeClient } from "#react.ts"

describe("useRealtime", () => {
  test("types params, events, and data from the channel catalog", () => {
    const { useRealtime } = createRealtimeClient({
      endpoint: "http://localhost/realtime",
      getToken: () => Promise.resolve("token"),
    })

    function Feed() {
      useRealtime({
        channel: "demo",
        events: ["greeted"],
        onData: ({ data, event }) => {
          expectTypeOf(event).toEqualTypeOf<"greeted">()
          expectTypeOf(data).toEqualTypeOf<{ message: string }>()
        },
        params: { userId: "user_1" },
      })
      // @ts-expect-error The channel does not exist.
      useRealtime({ channel: "missing", onData: (message) => message, params: {} })
      // @ts-expect-error The params belong to another channel.
      useRealtime({ channel: "demo", onData: (message) => message, params: { roomId: "room_1" } })
      useRealtime({
        channel: "demo",
        // @ts-expect-error The channel has no such event.
        events: ["deleted"],
        onData: (message) => message,
        params: { userId: "user_1" },
      })
    }

    expectTypeOf(Feed).toBeFunction()
  })
})
