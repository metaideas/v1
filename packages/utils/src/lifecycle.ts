import type { Logger } from "@v1/core/services/logging"
import * as try$ from "tryharder"
import { isUnhandledException } from "tryharder/errors"

// Below the 30 seconds that Kubernetes and most platforms allow between SIGTERM and SIGKILL.
const DEFAULT_TIMEOUT_MS = 25_000

// tryharder wraps an error that it does not map, which hides the original in the log.
function unwrap(error: unknown) {
  return isUnhandledException(error) ? error.cause : error
}

/**
 * Starts a server process with `run`, and stops it on SIGINT, SIGTERM, an uncaught exception, or a
 * failed `run`, leaving the restart to the process supervisor. `close` gets `timeoutMs` to release
 * the process's services. The process exits with code 1 when an error occurs before it exits, or
 * when `close` fails or runs out of time. A second signal exits at once with code 1. An unhandled
 * rejection is logged, and the process keeps running.
 *
 * Resolves once `run` settles. A `run` that returns leaves the process running until it stops.
 */
export async function lifecycle(
  run: () => unknown,
  { close, logger, scope, timeoutMs = DEFAULT_TIMEOUT_MS }: LifecycleOptions
) {
  // Stays undefined until the process starts stopping. An error while it stops raises it to 1.
  let exitCode: number | undefined
  let signals = 0

  async function stop(code: number) {
    const isStopping = exitCode !== undefined
    exitCode = Math.max(exitCode ?? 0, code)

    if (isStopping) return

    const closed = await try$.timeout(timeoutMs).run(() => close())

    if (closed instanceof Error) {
      logger.error({ error: unwrap(closed), message: "Process did not stop cleanly", scope })
      exitCode = 1
    }

    process.exit(exitCode)
  }

  function onSignal() {
    signals += 1

    if (signals > 1) {
      process.exit(1)
    }

    void stop(0)
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, onSignal)
  }

  process.on("unhandledRejection", (error) => {
    logger.error({ error, message: "Unhandled promise rejection", scope })
  })

  // After an uncaught exception the process state is unknown, so a fresh process replaces it.
  process.on("uncaughtException", (error) => {
    logger.error({ error, message: "Uncaught exception", scope })
    void stop(1)
  })

  const result = await try$.run(async () => {
    await run()
  })

  if (result instanceof Error) {
    logger.error({ error: unwrap(result), message: "Process failed", scope })
    await stop(1)
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
