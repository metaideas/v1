import crypto from "node:crypto"
import { isNotFound, isRedirect } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { getRequest, getResponseStatus } from "@tanstack/react-start/server"
import { createRequestLogger } from "evlog"
import "#shared/logger.ts"
import { resolveErrorStatus } from "#shared/server/error-status.ts"
import { auth, database } from "#shared/server/services.ts"

/**
 * Opens one wide event per server function call and emits it, with the response status, when the
 * function settles. Handlers add context through `context.log`.
 */
export const withLogger = createMiddleware({ type: "function" }).server(
  async ({ next, method, serverFnMeta }) => {
    const request = getRequest()
    const log = createRequestLogger({
      method,
      path: new URL(request.url).pathname,
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
    })

    log.set({ serverFn: { filename: serverFnMeta.filename, name: serverFnMeta.name } })

    try {
      const result = await next({ context: { log } })
      log.set({ status: getResponseStatus() })

      return result
    } catch (error) {
      // Function middleware never sees the final Response, so the status is derived from what was
      // thrown. Redirects and not-found are control flow, not failures.
      if (isRedirect(error)) {
        log.set({ status: error.status })
      } else if (isNotFound(error)) {
        log.set({ status: 404 })
      } else {
        log.error(error instanceof Error ? error : String(error))
        log.set({ status: resolveErrorStatus(error, getResponseStatus()) })
      }

      throw error
    } finally {
      log.emit()
    }
  }
)

export const withAuth = createMiddleware().server(({ next }) => next({ context: { auth } }))

export const withDatabase = createMiddleware().server(({ next }) => next({ context: { database } }))
