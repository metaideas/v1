import * as Faultier from "faultier"

/**
 * A webhook request that did not come from Stripe, failed its signature check, or carries an event
 * the application does not handle.
 */
export class InvalidWebhookError extends Faultier.Tagged("InvalidWebhookError")() {}

export const PaymentsFault = Faultier.registry({ InvalidWebhookError })
