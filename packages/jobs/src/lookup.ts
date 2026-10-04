import type * as z from "@v1/utils/schema"
import { type JobInput, type JobName, type JobPayload, type QueueName, queues } from "#catalog.ts"

// Indexing this mapped view with generic names keeps a job's payload type tied to its queue and
// name, which indexing `queues` directly does not.
const catalog: {
  [Queue in QueueName]: {
    jobs: {
      [Name in JobName<Queue>]: {
        payload: z.ZodType<JobPayload<Queue, Name>, JobInput<Queue, Name>>
        attempts?: number
      }
    }
  }
} = queues

export function getJob<Queue extends QueueName, Name extends JobName<Queue>>(
  queue: Queue,
  name: Name
) {
  return catalog[queue].jobs[name]
}
