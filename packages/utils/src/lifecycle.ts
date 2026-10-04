import type { Logger } from "@v1/core/services/logging"
import * as try$ from "tryharder"

// Below the 30 seconds that Kubernetes and most platforms allow between SIGTERM and SIGKILL.
const DEFAULT_TIMEOUT_MS = 25_000

/**
 * Stops a server process on SIGINT, SIGTERM, or an uncaught exception, and leaves the restart to
 * the process supervisor. `close` gets `timeoutMs` to release the process's services. The process
 * exits with code 1 when `close` fails, runs out of time, or follows an uncaught exception. A
 * second signal exits at once. An unhandled rejection is logged, and the process keeps running.
 */
export function handleLifecycle({
  close,
  logger,
  scope,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: LifecycleOptions) {
  let isStopping = false

  async function stop(exitCode: number) {
    if (isStopping) return
    isStopping = true

    const closed = await try$.timeout(timeoutMs).run(() => close())

    if (closed instanceof Error) {
      logger.error({ error: closed, message: "Process did not stop cleanly", scope })
    }

    process.exit(closed instanceof Error ? 1 : exitCode)
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void stop(0)
    })
  }

  process.on("unhandledRejection", (error) => {
    logger.error({ error, message: "Unhandled promise rejection", scope })
  })

  // After an uncaught exception the process state is unknown, so a fresh process replaces it.
  process.on("uncaughtException", (error) => {
    logger.error({ error, message: "Uncaught exception", scope })
    void stop(1)
  })

  return {
    /**
     * Closes the process's services and exits with `exitCode`. Later calls do nothing.
     */
    stop,
  }
}

type LifecycleOptions = {
  /**
   * Releases the process's services, such as servers, workers, and connections.
   */
  close: () => Promise<unknown>
  logger: Logger
  /**
   * The `scope` of the events that the lifecycle logs.
   */
  scope: string
  timeoutMs?: number
}
