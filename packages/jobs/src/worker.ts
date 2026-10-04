import type { Logger } from "@v1/core/services/logging"
import * as z from "@v1/utils/schema"
import { type Job, UnrecoverableError, Worker } from "bullmq"
import { Redis } from "ioredis"
import { type JobName, type JobPayload, type QueueName, queues } from "#catalog.ts"
import { getJob } from "#lookup.ts"

export function createJobWorker<Subscribed extends QueueName>({
  handlers,
  logger,
  url,
}: JobWorkerOptions<Subscribed>) {
  // BullMQ blocks on this connection while it waits for jobs, so commands must wait out a
  // reconnect instead of failing after a fixed number of retries.
  const connection = new Redis(url, { maxRetriesPerRequest: null })
  connection.on("error", (error) => {
    logger?.error({ error, message: "Job queue connection error", scope: "jobs" })
  })

  function subscribe<Queue extends Subscribed>(queue: Queue, queueHandlers: QueueHandlers<Queue>) {
    function isHandled(name: string): name is JobName<Queue> {
      return Object.hasOwn(queueHandlers, name)
    }

    async function processJob(job: Job) {
      if (!isHandled(job.name)) {
        throw new UnrecoverableError(`No handler for "${job.name}" on the "${queue}" queue`)
      }

      return handle(queue, job.name, queueHandlers[job.name], job.data, {
        attempt: job.attemptsMade + 1,
        id: job.id ?? "",
      })
    }

    const { concurrency, limiter } = queues[queue]
    const worker = new Worker(queue, processJob, {
      autorun: false,
      concurrency,
      connection,
      limiter,
    })

    worker.on("failed", (job, error) => {
      logger?.error({
        attempt: job?.attemptsMade,
        error,
        id: job?.id,
        job: job?.name,
        message: "Job failed",
        queue,
        scope: "jobs",
      })
    })
    worker.on("error", (error) => {
      logger?.error({ error, message: "Job worker error", queue, scope: "jobs" })
    })

    return worker
  }

  const workers = Object.keys(handlers)
    .filter((queue): queue is Subscribed => Object.hasOwn(queues, queue))
    .map((queue) => subscribe(queue, handlers[queue]))

  return {
    /**
     * Starts consuming every queue in `handlers`. Resolves once `close` stops the workers.
     */
    async run() {
      await Promise.all(workers.map((worker) => worker.run()))
    },

    /**
     * Stops taking jobs and waits for the jobs in progress to finish.
     */
    async close() {
      await Promise.all(workers.map((worker) => worker.close()))
      await connection.quit()
    },
  }
}

async function handle<Queue extends QueueName, Name extends JobName<Queue>>(
  queue: Queue,
  name: Name,
  handler: QueueHandlers<Queue>[Name],
  data: unknown,
  context: JobContext
) {
  const parsed = getJob(queue, name).payload.safeParse(data)

  if (!parsed.success) {
    throw new UnrecoverableError(
      `The payload of "${name}" does not match its schema:\n${z.prettifyError(parsed.error)}`
    )
  }

  return handler(parsed.data, context)
}

export type JobWorker = ReturnType<typeof createJobWorker>

export type { JobName, JobPayload, QueueName } from "#catalog.ts"

/**
 * A handler for every job on a queue. Adding a job to a queue fails type checking in each worker
 * that consumes the queue until it handles the job.
 */
type QueueHandlers<Queue extends QueueName> = {
  [Name in JobName<Queue>]: (
    payload: JobPayload<Queue, Name>,
    context: JobContext
  ) => Promise<unknown>
}

type JobContext = {
  /**
   * The current attempt, starting at 1.
   */
  attempt: number
  /**
   * Stays the same across attempts, so a handler can pass it on as an idempotency key.
   */
  id: string
}

type JobWorkerOptions<Subscribed extends QueueName> = {
  /**
   * Handlers by queue and job. The worker consumes every queue listed here.
   */
  handlers: { [Queue in Subscribed]: QueueHandlers<Queue> }
  url: string
  logger?: Logger
}
