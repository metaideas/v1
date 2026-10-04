import type { LogEvent, Logger } from "@v1/core/services/logging"
import { Inngest, type Logger as InngestLogger } from "inngest"

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

// Inngest logs Pino-style: an optional object, then a message.
function toEvent(args: unknown[]): LogEvent {
  const [first, ...rest] = args

  if (typeof first === "string") {
    return { message: first, scope: "workflows" }
  }

  const message = rest.find((value) => typeof value === "string")

  if (first instanceof Error) {
    return { error: first, message, scope: "workflows" }
  }

  if (typeof first !== "object" || first === null) {
    return { details: first, message, scope: "workflows" }
  }

  // Inngest reports failures as `{ err }`, and other packages log them under `error`.
  const { err, ...fields }: LogEvent = { ...first }

  return { ...fields, ...(err === undefined ? {} : { error: err }), message, scope: "workflows" }
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
    ...(logger
      ? { internalLogger: toInternalLogger(logger), logger: toInngestLogger(logger) }
      : {}),
  })
}

export type Workflows = ReturnType<typeof createWorkflows>
