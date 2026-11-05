import { describe, expect, mock, test } from "bun:test"
import { mockQueues, UnrecoverableError } from "#__tests__/fakes.ts"

const { processors, redis, worker } = await mockQueues()

const { createJobsRunner } = await import("#runner.ts")

const greetUser = mock((_payload: { userId: string }, _context: unknown) => Promise.resolve("hi"))

const jobRunner = createJobsRunner({
  handlers: { default: { "greet-user": greetUser } },
  url: "redis://localhost:6379",
})

function processJob(job: { attemptsMade: number; data: unknown; id: string; name: string }) {
  const processor = processors.get("default")
  if (!processor) throw new Error("The runner did not subscribe to the default queue")

  return processor(job)
}

describe("createJobsRunner", () => {
  test("passes the parsed payload and the attempt to the job's handler", async () => {
    const result = await processJob({
      attemptsMade: 1,
      data: { userId: "user_1" },
      id: "1",
      name: "greet-user",
    })

    expect(result).toBe("hi")
    expect(greetUser).toHaveBeenLastCalledWith({ userId: "user_1" }, { attempt: 2, id: "1" })
  })

  test("fails a job with an invalid payload without retrying it", async () => {
    const job = { attemptsMade: 0, data: { userId: 1 }, id: "2", name: "greet-user" }

    const error = await processJob(job).catch((error: unknown) => error)

    expect(error).toBeInstanceOf(UnrecoverableError)
  })

  test("fails a job that its queue does not list without retrying it", async () => {
    const job = { attemptsMade: 0, data: {}, id: "3", name: "unknown-job" }

    const error = await processJob(job).catch((error: unknown) => error)

    expect(error).toBeInstanceOf(UnrecoverableError)
  })

  test("waits for running jobs when it closes while connected", async () => {
    redis.status = "ready"

    await jobRunner.close()

    expect(worker.close).toHaveBeenLastCalledWith(false)
    expect(redis.quit).toHaveBeenCalled()
  })

  test("closes at once while Redis is unreachable", async () => {
    redis.status = "reconnecting"

    await jobRunner.close()

    expect(worker.close).toHaveBeenLastCalledWith(true)
    expect(redis.disconnect).toHaveBeenCalled()
  })
})
