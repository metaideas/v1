import * as Fault from "@sanely/errors"

export class SendEmailError extends Fault.Tagged("SendEmailError")<{
  template: string
  to: string[]
}>() {}

/**
 * A transport could not deliver a message. `isRetryable` is false when the provider rejected the
 * message itself, such as an invalid sender, so another attempt would fail the same way.
 */
export class EmailDeliveryError extends Fault.Tagged("EmailDeliveryError")<{
  transport: string
  isRetryable: boolean
}>() {}

export class EmailConfigurationError extends Fault.Tagged("EmailConfigurationError")() {}

export const EmailFault = Fault.registry({
  EmailConfigurationError,
  EmailDeliveryError,
  SendEmailError,
})
