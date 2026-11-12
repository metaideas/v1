import type { ErrorComponentProps } from "@tanstack/react-router"
import { useEffect } from "react"
import { log } from "#shared/logger.ts"

/**
 * Logs what a route's error boundary caught. The router passes any thrown value, not only an
 * `Error`.
 */
export function useLogRenderError(error: ErrorComponentProps["error"]) {
  useEffect(() => {
    log.error({ error, message: "Route rendering failed" })
  }, [error])
}
