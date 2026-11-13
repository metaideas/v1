import type { Logger } from "@v1/core/services/logging"
import * as z from "@v1/utils/schema"
import { Inngest, type LogArg, type Logger as InngestLogger } from "inngest"

type WorkflowsOptions = {
  /**
   * Names the application in Inngest, such as `api` or `worker`.
   */
  id: string
  eventKey: string
  signingKey: string
  signingKeyFallback?: string
  /**
   * Dev Server or self-hosted server URL. Inngest Cloud is the default.
   */
  baseUrl?: string
  isDev?: boolean
  logger?: Logger
}

const LogMessage = z.string()

// Inngest reports failures as `{ err }`, and other packages log them under `error`.
const LogFields = z.looseObject({ err: z.unknown().optional() })

// Inngest logs Pino-style: an optional object, then a message.
function toEvent([first, ...rest]: LogArg[]) {
  const text = LogMessage.safeParse(first)

  if (text.success) {
    return { message: text.data, scope: "workflows" }
  }

  const message = rest
    .values()
    .map((value) => LogMessage.safeParse(value))
    .find((parsed) => parsed.success)?.data

  if (first instanceof Error) {
    return { error: first, message, scope: "workflows" }
  }

  const parsed = LogFields.safeParse(first)

  if (!parsed.success) {
    return { details: first, message, scope: "workflows" }
  }

  const { err, ...fields } = parsed.data

  return err === undefined
    ? { ...fields, message, scope: "workflows" }
    : { ...fields, error: err, message, scope: "workflows" }
}

function toInngestLogger(log: Logger): InngestLogger {
  return {
    debug: (...args) => {
      log.debug(toEvent(args))
    },
    error: (...args) => {
      log.error(toEvent(args))
    },
    info: (...args) => {
      log.info(toEvent(args))
    },
    warn: (...args) => {
      log.warn(toEvent(args))
    },
  }
}

// SDK internals, such as worker heartbeats and sync notices, log at debug.
function toInternalLogger(log: Logger): InngestLogger {
  return {
    ...toInngestLogger(log),
    info: (...args) => {
      log.debug(toEvent(args))
    },
  }
}

/**
 * Creates the Inngest client that sends events and defines the functions that handle them.
 */
export function createWorkflows({ logger, ...options }: WorkflowsOptions) {
  return new Inngest({
    ...options,
    internalLogger: logger && toInternalLogger(logger),
    logger: logger && toInngestLogger(logger),
  })
}

export type Workflows = ReturnType<typeof createWorkflows>
