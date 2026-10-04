import { type QueueName, queues } from "#catalog.ts"

/**
 * The name of every queue, for tools that open queues themselves, such as a dashboard.
 */
export const queueNames = Object.keys(queues).filter((name): name is QueueName =>
  Object.hasOwn(queues, name)
)
