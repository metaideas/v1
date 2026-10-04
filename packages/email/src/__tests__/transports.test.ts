import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { EmailDeliveryError } from "@v1/core/errors"
import { resendTransport, smtpTransport } from "#transports.ts"

const message = {
  from: "v1 <dev@example.com>",
  html: "<p>Hello</p>",
  subject: "Hello",
  text: "Hello",
  to: ["ada@example.com"],
}

function stubResendResponse(status: number, body: object) {
  const fetch = spyOn(globalThis, "fetch")
  fetch.mockResolvedValue(Response.json(body, { status }))
}

afterEach(() => {
  mock.restore()
})

describe("resendTransport", () => {
  test("reports a Resend server error as a retryable delivery error", async () => {
    stubResendResponse(503, {
      message: "API is temporarily unavailable",
      name: "service_unavailable",
      statusCode: 503,
    })

    const error = await resendTransport("re_test")
      .send(message, { idempotencyKey: "key" })
      .catch((error: unknown) => error)

    expect(error).toMatchObject({ isRetryable: true, transport: "resend" })
  })

  test("reports an exhausted quota as a permanent delivery error", async () => {
    stubResendResponse(429, {
      message: "Daily quota exceeded",
      name: "daily_quota_exceeded",
      statusCode: 429,
    })

    const error = await resendTransport("re_test")
      .send(message, { idempotencyKey: "key" })
      .catch((error: unknown) => error)

    expect(error).toMatchObject({ isRetryable: false, transport: "resend" })
  })
})

describe("smtpTransport", () => {
  test("reports an unreachable server as a retryable delivery error", async () => {
    const transport = smtpTransport("smtp://127.0.0.1:1")

    const error = await transport
      .send(message, { idempotencyKey: "key" })
      .catch((error: unknown) => error)

    expect(error).toBeInstanceOf(EmailDeliveryError)
    expect(error).toMatchObject({ isRetryable: true, transport: "smtp" })
  })
})
