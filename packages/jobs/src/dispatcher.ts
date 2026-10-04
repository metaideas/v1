import type { Logger } from "@v1/core/services/logging"
import { DispatchJobError, type JobPayloadError, JobsFault } from "@v1/core/errors"
import { Queue } from "bullmq"
import { Redis } from "ioredis"
import * as try$ from "tryharder"
import type { JobInput, JobName, QueueName } from "#catalog.ts"
import { getJob } from "#lookup.ts"

const DEFAULT_ATTEMPTS = 3

const DEFAULT_JOB_OPTIONS = {
  attempts: DEFAULT_ATTEMPTS,
  backoff: { delay: 1000, type: "exponential" },
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
} as const

export function createDispatcher({ logger, url }: DispatcherOptions) {
  // A dispatch waits while the connection opens, but fails after one reconnect attempt while Redis
  // is unreachable instead of holding the request open until Redis returns.
  const connection = new Redis(url, { maxRetriesPerRequest: 1 })
  connection.on("error", (error) => {
    logger?.error({ error, message: "Job queue connection error", scope: "jobs" })
  })
  const opened = new Map<QueueName, Queue>()

  function queueFor(name: QueueName) {
    const existing = opened.get(name)
    if (existing) return existing

    const queue = new Queue(name, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
      skipWaitingForReady: true,
    })
    opened.set(name, queue)

    return queue
  }

  // BullMQ keeps a queue's first connection attempt, so a queue first used while Redis is down
  // would fail every later dispatch. Dropping it lets the next dispatch open a fresh one.
  function discardQueue(name: QueueName) {
    const queue = opened.get(name)
    opened.delete(name)
    void queue?.close().catch((error: unknown) => {
      logger?.debug({
        error,
        message: "Discarded job queue did not close",
        queue: name,
        scope: "jobs",
      })
    })
  }

  return {
    /**
     * Validates the payload and adds the job to its queue. Dispatches that share an `id` add one
     * job while BullMQ keeps it. A failed dispatch comes back as a value instead of throwing.
     */
    async dispatch<Queue extends QueueName, Name extends JobName<Queue>>(
      queue: Queue,
      name: Name,
      input: JobInput<Queue, Name>,
      options: DispatchOptions = {}
    ): Promise<{ id: string } | DispatchJobError | JobPayloadError> {
      const { attempts = DEFAULT_ATTEMPTS, payload } = getJob(queue, name)
      const parsed = payload.safeParse(input)

      if (!parsed.success) {
        const error = JobsFault.wrap(parsed.error).as("JobPayloadError", { job: name, queue })
        logger?.error({ error, job: name, message: "Job payload is invalid", queue, scope: "jobs" })

        return error
      }

      const result = await try$.run({
        catch: (error) => JobsFault.wrap(error).as("DispatchJobError", { job: name, queue }),
        // The worker parses the payload again, so queue the input. Queueing the parsed output would
        // run the schema's transforms twice.
        try: () =>
          queueFor(queue).add(name, input, {
            attempts,
            delay: options.delayMs,
            jobId: options.id,
          }),
      })

      if (result instanceof DispatchJobError) {
        discardQueue(queue)
        logger?.error({
          error: result,
          job: name,
          message: "Job dispatch failed",
          queue,
          scope: "jobs",
        })

        return result
      }

      const id = result.id ?? ""
      logger?.debug({ id, job: name, message: "Job dispatched", queue, scope: "jobs" })

      return { id }
    },

    async close() {
      await Promise.allSettled([...opened.values()].map((queue) => queue.close()))

      if (connection.status === "ready") {
        await connection.quit()
      } else {
        connection.disconnect()
      }
    },
  }
}

export type Dispatcher = ReturnType<typeof createDispatcher>

export type { JobInput, JobName, QueueName } from "#catalog.ts"

type DispatcherOptions = {
  url: string
  logger?: Logger
}

type DispatchOptions = {
  /**
   * Deduplicates the job. It cannot be an integer or contain a colon.
   */
  id?: string
  delayMs?: number
}
