import crypto from "node:crypto"
import { isNotFound, isRedirect } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { getRequest, getResponseStatus } from "@tanstack/react-start/server"
import { createRequestLogger } from "evlog"
import "#shared/logger.ts"
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
        // Start answers a thrown error with an error status set through a response helper, else the
        // error's own `status` or `statusCode`, else 500.
        const helperStatus = getResponseStatus()
        const errorStatus =
          error instanceof Error
            ? [
                "status" in error ? error.status : undefined,
                "statusCode" in error ? error.statusCode : undefined,
              ].find(
                (code): code is number => typeof code === "number" && code >= 400 && code <= 599
              )
            : undefined
        log.set({ status: helperStatus >= 400 ? helperStatus : (errorStatus ?? 500) })
      }

      throw error
    } finally {
      log.emit()
    }
  }
)

export const withAuth = createMiddleware().server(({ next }) => next({ context: { auth } }))

export const withDatabase = createMiddleware().server(({ next }) => next({ context: { database } }))
