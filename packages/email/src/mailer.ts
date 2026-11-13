import type { Logger } from "@v1/core/services/logging"
import { render } from "@react-email/render"
import { ms } from "@sanely/duration"
import * as try$ from "@sanely/try"
import { isTimeoutError } from "@sanely/try/errors"
import type { EmailTransport } from "#transports.ts"
import { EmailDeliveryError, EmailFault, SendEmailError } from "#errors.ts"
import { type TemplateName, type TemplateProps, templates } from "#registry.ts"

export type { TemplateName, TemplateProps } from "#registry.ts"

type MailerOptions = {
  from: string
  transport: EmailTransport
  logger?: Logger
  /**
   * Delivery attempts per send, including the first.
   */
  attempts?: number
  /**
   * Deadline for one send across all attempts.
   */
  timeoutMs?: number
}

type SendOptions = {
  to: string[]
  from?: string
}

export function createMailer({
  attempts = 3,
  from,
  logger,
  timeoutMs = ms("15s"),
  transport,
}: MailerOptions) {
  return {
    /**
     * Renders a template and delivers it. Temporary delivery failures are retried with backoff
     * under one deadline, and a failed send comes back as a `SendEmailError` instead of throwing.
     */
    async send<Name extends TemplateName>(
      name: Name,
      props: TemplateProps<Name>,
      options: SendOptions
    ): Promise<{ id: string } | SendEmailError> {
      const { element, subject } = templates[name](props)
      const [html, text] = await Promise.all([
        render(element),
        render(element, { plainText: true }),
      ])
      const message = { from: options.from ?? from, html, subject, text, to: options.to }
      const idempotencyKey = crypto.randomUUID()

      const result = await try$
        .retry({
          backoff: "exponential",
          delay: "250ms",
          jitter: true,
          limit: attempts,
          maxDelay: "2s",
          shouldRetry: (error) =>
            !(error instanceof EmailDeliveryError) || error.fields.isRetryable,
        })
        .timeout(timeoutMs)
        .run({
          catch: (error) =>
            EmailFault.wrap(error).as("SendEmailError", { template: name, to: options.to }),
          try: () => transport.send(message, { idempotencyKey }),
        })

      const outcome = isTimeoutError(result)
        ? EmailFault.wrap(result).as("SendEmailError", { template: name, to: options.to })
        : result

      if (outcome instanceof SendEmailError) {
        logger?.error({ error: outcome, message: "Email failed", scope: "email", template: name })

        return outcome
      }

      logger?.info({ id: outcome.id, message: "Email sent", scope: "email", template: name })

      return outcome
    },
  }
}

export type Mailer = ReturnType<typeof createMailer>
