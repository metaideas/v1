import type * as z from "@v1/utils/schema"
import { defaultQueue } from "#queues/default.ts"

/**
 * Every queue that runners consume. A queue's name is its key here.
 */
export const queues = {
  default: defaultQueue,
}

export type QueueName = keyof typeof queues

export type JobName<Queue extends QueueName> = keyof (typeof queues)[Queue]["jobs"] & string

/**
 * What a dispatcher sends for a job, before its schema parses it.
 */
export type JobInput<Queue extends QueueName, Name extends JobName<Queue>> = z.input<
  JobSchema<Queue, Name>
>

/**
 * What a handler receives for a job, after its schema parses it.
 */
export type JobPayload<Queue extends QueueName, Name extends JobName<Queue>> = z.output<
  JobSchema<Queue, Name>
>

type JobSchema<
  Queue extends QueueName,
  Name extends JobName<Queue>,
> = (typeof queues)[Queue]["jobs"][Name] extends { payload: infer Schema } ? Schema : never
