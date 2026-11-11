import * as Fault from "@sanely/errors"

/**
 * A job could not reach its queue, such as when Redis is down. Callers decide whether to retry the
 * request, fall back, or fail it.
 */
export class DispatchJobError extends Fault.Tagged("DispatchJobError")<{
  job: string
  queue: string
}>() {}

/**
 * A payload did not match the job's schema, so the job was not dispatched.
 */
export class JobPayloadError extends Fault.Tagged("JobPayloadError")<{
  job: string
  queue: string
}>() {}

export const JobsFault = Fault.registry({
  DispatchJobError,
  JobPayloadError,
})
