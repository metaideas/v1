import type * as z from "@v1/utils/schema"

/**
 * Declares a job. Write it inline in a queue's `jobs`, or in its own file when a queue grows large.
 */
export function defineJob<Schema extends z.ZodType>(job: JobDefinition<Schema>) {
  return job
}

/**
 * Declares a queue and the jobs it carries. A job's name is its key in `jobs`, so a queue cannot
 * list two jobs with the same name.
 */
export function defineQueue<Schemas extends Record<string, z.ZodType>>(
  queue: QueueDefinition<Schemas>
) {
  return queue
}

type JobDefinition<Schema extends z.ZodType> = {
  payload: Schema
  /**
   * Attempts per job, including the first.
   */
  attempts?: number
}

type QueueDefinition<Schemas extends Record<string, z.ZodType>> = {
  /**
   * Jobs that each worker process runs at once from this queue.
   */
  concurrency: number
  jobs: { [Name in keyof Schemas]: JobDefinition<Schemas[Name]> }
  /**
   * At most `max` jobs start in each `duration` window in milliseconds, across every worker of the
   * queue.
   */
  limiter?: { duration: number; max: number }
}
