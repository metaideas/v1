import { vi } from "vitest"

type FakeJob = { attemptsMade: number; data: unknown; id: string; name: string }

type Processor = (job: FakeJob) => Promise<unknown>

export class UnrecoverableError extends Error {
  override name = "UnrecoverableError"
}

/**
 * Replaces Redis and BullMQ for the modules that the test imports afterward. The fakes cover every
 * export the package uses.
 */
export function mockQueues() {
  const add = vi.fn((name: string, data: unknown, options: { jobId?: string }) =>
    Promise.resolve({ data, id: options.jobId ?? "1", name })
  )

  const processors = new Map<string, Processor>()

  const redis = {
    disconnect: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(() => Promise.resolve("OK")),
    status: "ready",
  }

  const worker = {
    close: vi.fn((_force?: boolean) => Promise.resolve()),
    on: () => worker,
    run: () => Promise.resolve(),
  }

  const queue = { add, close: () => Promise.resolve(), on: vi.fn() }

  // The package calls `new Queue()` and `new Worker()`, and an arrow function can't be constructed.
  function createQueue() {
    return queue
  }

  function createWorker(name: string, processor: Processor) {
    processors.set(name, processor)

    return worker
  }

  const Queue = vi.fn(createQueue)

  vi.doMock("redis", () => ({ createClient: vi.fn(() => ({})) }))
  vi.doMock("bullmq", () => ({
    Queue,
    UnrecoverableError,
    Worker: vi.fn(createWorker),
    createNodeRedisClient: vi.fn(() => redis),
  }))

  return { Queue, add, processors, queue, redis, worker }
}
