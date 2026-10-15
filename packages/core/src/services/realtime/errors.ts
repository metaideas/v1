import * as Faultier from "faultier"

/**
 * An event could not reach Redis, so no subscriber received it. Callers decide whether to retry,
 * fall back, or fail the request.
 */
export class PublishEventError extends Faultier.Tagged("PublishEventError")<{
  channel: string
  event: string
}>() {}

/**
 * A channel's params or an event's data did not match its schema, so the event was not published.
 */
export class RealtimePayloadError extends Faultier.Tagged("RealtimePayloadError")<{
  channel: string
  event: string
}>() {}

export const RealtimeFault = Faultier.registry({
  PublishEventError,
  RealtimePayloadError,
})
