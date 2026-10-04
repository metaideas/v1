import { describe, expect, test } from "bun:test"
import { DispatchJobError, JobPayloadError } from "@v1/core/errors"
import { mockQueues } from "#__tests__/fakes.ts"

const { add } = await mockQueues()

const { createDispatcher } = await import("#dispatcher.ts")

describe("createDispatcher", () => {
  test("adds the parsed payload to the job's queue", async () => {
    const dispatcher = createDispatcher({ url: "redis://localhost:6379" })

    const result = await dispatcher.dispatch(
      "default",
      "greet-user",
      { userId: "user_1" },
      { id: "greet-1" }
    )

    expect(result).toEqual({ id: "greet-1" })
    expect(add).toHaveBeenLastCalledWith(
      "greet-user",
      { userId: "user_1" },
      { attempts: 3, delay: undefined, jobId: "greet-1" }
    )
  })

  test("returns a payload error without adding the job", async () => {
    const dispatcher = createDispatcher({ url: "redis://localhost:6379" })
    add.mockClear()

    // @ts-expect-error The payload breaks the job's schema on purpose.
    const result = await dispatcher.dispatch("default", "greet-user", { userId: 1 })

    expect(result).toBeInstanceOf(JobPayloadError)
    expect(add).not.toHaveBeenCalled()
  })

  test("returns a dispatch error when the queue rejects the job", async () => {
    const dispatcher = createDispatcher({ url: "redis://localhost:6379" })
    add.mockImplementationOnce(() => Promise.reject(new Error("Stream isn't writeable")))

    const result = await dispatcher.dispatch("default", "greet-user", { userId: "user_1" })

    expect(result).toBeInstanceOf(DispatchJobError)
  })
})
