import * as Faultier from "faultier"

export class SendEmailError extends Faultier.Tagged("SendEmailError")<{
  template: string
  to: string[]
}>() {}

/**
 * A transport could not deliver a message. `isRetryable` is false when the provider rejected the
 * message itself, such as an invalid sender, so another attempt would fail the same way.
 */
export class EmailDeliveryError extends Faultier.Tagged("EmailDeliveryError")<{
  transport: string
  isRetryable: boolean
}>() {}

export class EmailConfigurationError extends Faultier.Tagged("EmailConfigurationError")() {}

export const EmailFault = Faultier.registry({
  EmailConfigurationError,
  EmailDeliveryError,
  SendEmailError,
})
