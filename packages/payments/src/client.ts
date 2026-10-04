import type { Storage } from "unstorage"
import { InvalidWebhookError, PaymentsFault } from "@v1/core/errors"
import Stripe from "stripe"
import * as try$ from "tryharder"
import { prefixStorage } from "unstorage"
import { ExpandedPaymentMethodSchema } from "#schemas.ts"

export type { Stripe } from "stripe"

export type SubscriptionCache =
  | {
      subscriptionId: string | null
      status: Stripe.Subscription.Status
      priceId: string | null
      currentPeriodStart: number | null
      currentPeriodEnd: number | null
      cancelAtPeriodEnd: boolean
      paymentMethod: {
        brand: string | null
        last4: string | null
      } | null
    }
  | {
      status: "none"
    }

type PaymentsOptions = {
  secretKey: string
  webhookSecret: string
  /**
   * Storage for the subscription cache. Keys are prefixed with `payments:customer:`.
   */
  storage: Storage
}

const ALLOWED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
] as const satisfies Stripe.Event.Type[]

type AllowedEvent = (typeof ALLOWED_EVENTS)[number]

function checkIsAllowedEvent(event: Stripe.Event): event is Stripe.Event & { type: AllowedEvent } {
  return ALLOWED_EVENTS.some((type) => type === event.type)
}

/**
 * Stripe payments with a subscription cache. Stripe stays the source of truth: webhooks call
 * `syncSubscription`, and reads go through the cache in `storage`.
 */
export function createPayments({ secretKey, storage, webhookSecret }: PaymentsOptions) {
  const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" })
  const subscriptions = prefixStorage<SubscriptionCache>(storage, "payments:customer")

  async function syncSubscription(customerId: string): Promise<SubscriptionCache> {
    const { data } = await stripe.subscriptions.list({
      customer: customerId,
      expand: ["data.default_payment_method"],
      limit: 1,
      status: "all",
    })

    const subscription = data[0]
    const item = subscription?.items.data[0]

    if (!subscription || !item) {
      const none = { status: "none" } as const
      await subscriptions.setItem(customerId, none)

      return none
    }

    const paymentMethod = ExpandedPaymentMethodSchema.safeParse(subscription.default_payment_method)
    const cache: SubscriptionCache = {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: item.current_period_end,
      currentPeriodStart: item.current_period_start,
      paymentMethod: paymentMethod.success
        ? {
            brand: paymentMethod.data.card?.brand ?? null,
            last4: paymentMethod.data.card?.last4 ?? null,
          }
        : null,
      priceId: item.price.id,
      status: subscription.status,
      subscriptionId: subscription.id,
    }

    await subscriptions.setItem(customerId, cache)

    return cache
  }

  return {
    /**
     * Returns the cached subscription of a customer, fetching it from Stripe on a cache miss.
     */
    async getSubscription(customerId: string) {
      return (await subscriptions.getItem(customerId)) ?? syncSubscription(customerId)
    },

    /**
     * Verifies a Stripe webhook request and returns its event, or an `InvalidWebhookError` for a
     * missing or invalid signature or an event type the application does not handle.
     */
    async parseWebhook(request: Request) {
      const signature = request.headers.get("stripe-signature")

      if (signature === null) {
        return PaymentsFault.create("InvalidWebhookError").withMessage(
          "Missing stripe-signature header"
        )
      }

      const body = await request.text()
      const event = await try$.run({
        catch: (error) =>
          PaymentsFault.wrap(error)
            .as("InvalidWebhookError")
            .withMessage("Invalid webhook signature"),
        try: () => stripe.webhooks.constructEventAsync(body, signature, webhookSecret),
      })

      if (event instanceof InvalidWebhookError) {
        return event
      }

      if (!checkIsAllowedEvent(event)) {
        return PaymentsFault.create("InvalidWebhookError").withMessage(
          `Unhandled webhook event ${event.type}`
        )
      }

      return event
    },

    stripe,

    /**
     * Fetches the latest subscription of a customer from Stripe and stores it in the cache. Call it
     * from webhook handlers and after checkout.
     */
    syncSubscription,
  }
}

export type Payments = ReturnType<typeof createPayments>
