import { InvalidWebhookError } from "@v1/core/errors"
import { createStorage } from "unstorage"
import { describe, expect, test } from "vitest"
import { createPayments } from "#client.ts"

const webhookSecret = "whsec_test_secret"

function createTestPayments() {
  const storage = createStorage()
  const payments = createPayments({ secretKey: "sk_test_key", storage, webhookSecret })

  return { payments, storage }
}

async function createWebhookRequest(payload: object, signature?: string) {
  const body = JSON.stringify(payload)
  const { payments } = createTestPayments()
  const header =
    signature
    ?? (await payments.stripe.webhooks.generateTestHeaderStringAsync({
      payload: body,
      secret: webhookSecret,
    }))

  return new Request("https://example.com/webhooks/stripe", {
    body,
    headers: { "stripe-signature": header },
    method: "POST",
  })
}

const event = { data: { object: {} }, id: "evt_1", object: "event", type: "invoice.paid" }

describe("parseWebhook", () => {
  test("returns the event for a signed request with a handled type", async () => {
    const { payments } = createTestPayments()

    const result = await payments.parseWebhook(await createWebhookRequest(event))

    expect(result).toMatchObject({ id: "evt_1", type: "invoice.paid" })
  })

  test("returns InvalidWebhookError without a signature header", async () => {
    const { payments } = createTestPayments()
    const request = new Request("https://example.com/webhooks/stripe", {
      body: "{}",
      method: "POST",
    })

    expect(await payments.parseWebhook(request)).toBeInstanceOf(InvalidWebhookError)
  })

  test("returns InvalidWebhookError with the cause for a bad signature", async () => {
    const { payments } = createTestPayments()

    const result = await payments.parseWebhook(await createWebhookRequest(event, "t=1,v1=invalid"))

    expect(result).toBeInstanceOf(InvalidWebhookError)
    expect(result instanceof InvalidWebhookError && result.cause).toBeInstanceOf(Error)
  })

  test("returns InvalidWebhookError for an event type the application does not handle", async () => {
    const { payments } = createTestPayments()

    const request = await createWebhookRequest({ ...event, type: "charge.refunded" })
    const result = await payments.parseWebhook(request)

    expect(result).toBeInstanceOf(InvalidWebhookError)
  })
})

describe("getSubscription", () => {
  test("reads a cached subscription under the payments prefix without calling Stripe", async () => {
    const { payments, storage } = createTestPayments()
    await storage.setItem("payments:customer:cus_1", { status: "none" })

    expect(await payments.getSubscription("cus_1")).toEqual({ status: "none" })
  })
})
