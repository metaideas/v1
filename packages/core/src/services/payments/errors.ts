import * as Fault from "@sanely/errors"

/**
 * A webhook request that did not come from Stripe, failed its signature check, or carries an event
 * the application does not handle.
 */
export class InvalidWebhookError extends Fault.Tagged("InvalidWebhookError")() {}

export const PaymentsFault = Fault.registry({ InvalidWebhookError })
