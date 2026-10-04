import { describe, expect, mock, test } from "bun:test"
import { EmailDeliveryError, SendEmailError } from "@v1/core/errors"
import { isTimeoutError } from "tryharder/errors"
import type { EmailMessage, SendContext } from "#transports.ts"
import { createMailer } from "#mailer.ts"

const props = { appName: "v1", resetUrl: "https://example.com/reset?token=abc" }
const from = "v1 <dev@example.com>"
const to = ["ada@example.com"]

describe("createMailer", () => {
  test("renders the template subject, HTML, and text and sends them through the transport", async () => {
    const send = mock((_message: EmailMessage, _context: SendContext) =>
      Promise.resolve({ id: "sent" })
    )
    const mailer = createMailer({ from, transport: { send } })

    const result = await mailer.send("password-reset", props, { to })

    expect(result).toEqual({ id: "sent" })
    expect(send).toHaveBeenCalledTimes(1)

    const message = send.mock.calls[0]?.[0]
    expect(message?.from).toBe(from)
    expect(message?.to).toEqual(to)
    expect(message?.subject).toBe("Reset your v1 password")
    expect(message?.html).toContain(props.resetUrl)
    expect(message?.text).toContain(props.resetUrl)
  })

  test("retries temporary failures with the same idempotency key", async () => {
    const send = mock((_message: EmailMessage, _context: SendContext) =>
      send.mock.calls.length < 2
        ? Promise.reject(new EmailDeliveryError({ isRetryable: true, transport: "test" }))
        : Promise.resolve({ id: "sent" })
    )
    const mailer = createMailer({ from, transport: { send } })

    const result = await mailer.send("password-reset", props, { to })

    expect(result).toEqual({ id: "sent" })
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0]?.[1].idempotencyKey).toBe(send.mock.calls[1]?.[1].idempotencyKey)
  })

  test("returns SendEmailError without retrying a permanent failure", async () => {
    const cause = new EmailDeliveryError({ isRetryable: false, transport: "test" })
    const send = mock(() => Promise.reject(cause))
    const mailer = createMailer({ from, transport: { send } })

    const result = await mailer.send("password-reset", props, { to })

    expect(result).toBeInstanceOf(SendEmailError)
    expect(result).toMatchObject({ cause, template: "password-reset", to })
    expect(send).toHaveBeenCalledTimes(1)
  })

  test("returns SendEmailError once every attempt fails", async () => {
    const send = mock(() => Promise.reject(new Error("connection refused")))
    const mailer = createMailer({ attempts: 2, from, transport: { send } })

    const result = await mailer.send("password-reset", props, { to })

    expect(result).toBeInstanceOf(SendEmailError)
    expect(send).toHaveBeenCalledTimes(2)
  })

  test("returns SendEmailError caused by a timeout when the deadline passes", async () => {
    const mailer = createMailer({
      from,
      timeoutMs: 20,
      transport: { send: () => Promise.withResolvers<{ id: string }>().promise },
    })

    const result = await mailer.send("password-reset", props, { to })

    expect(result).toBeInstanceOf(SendEmailError)
    expect(result instanceof SendEmailError && isTimeoutError(result.cause)).toBe(true)
  })
})
