import { mock } from "bun:test"

type FakeJob = { attemptsMade: number; data: unknown; id: string; name: string }

type Processor = (job: FakeJob) => Promise<unknown>

export class UnrecoverableError extends Error {
  override name = "UnrecoverableError"
}

/**
 * Replaces Redis and BullMQ for the package. Bun shares module mocks across test files, so the
 * fakes cover every export the package uses.
 */
export async function mockQueues() {
  const add = mock((name: string, data: unknown, options: { jobId?: string }) =>
    Promise.resolve({ data, id: options.jobId ?? "1", name })
  )
  const processors = new Map<string, Processor>()
  const redis = {
    disconnect: mock(),
    on: mock(),
    quit: mock(() => Promise.resolve("OK")),
    status: "ready",
  }
  const worker = {
    close: mock((_force?: boolean) => Promise.resolve()),
    on: () => worker,
    run: () => Promise.resolve(),
  }
  const Queue = mock(() => ({ add, close: () => Promise.resolve() }))

  await mock.module("ioredis", () => ({ Redis: mock(() => redis) }))
  await mock.module("bullmq", () => ({
    Queue,
    UnrecoverableError,
    Worker: mock((queue: string, processor: Processor) => {
      processors.set(queue, processor)

      return worker
    }),
  }))

  return { Queue, add, processors, redis, worker }
}
