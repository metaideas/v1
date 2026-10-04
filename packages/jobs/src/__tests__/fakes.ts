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
  const worker = {
    close: () => Promise.resolve(),
    on: () => worker,
    run: () => Promise.resolve(),
  }

  await mock.module("ioredis", () => ({
    Redis: mock(() => ({ on: mock(), quit: () => Promise.resolve("OK") })),
  }))
  await mock.module("bullmq", () => ({
    Queue: mock(() => ({ add, close: () => Promise.resolve() })),
    UnrecoverableError,
    Worker: mock((queue: string, processor: Processor) => {
      processors.set(queue, processor)

      return worker
    }),
  }))

  return { add, processors }
}
