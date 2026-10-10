import { ms } from "humanspan"
import * as try$ from "tryharder"
import { isUnhandledException } from "tryharder/errors"

// Below the 30 seconds that Kubernetes and most platforms allow between SIGTERM and SIGKILL.
const DEFAULT_TIMEOUT_MS = ms("25s")

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
  { close, onError, timeoutMs = DEFAULT_TIMEOUT_MS }: LifecycleOptions
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
      onError(unwrap(closed), "Process did not stop cleanly")
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
    onError(error, "Unhandled promise rejection")
  })

  // After an uncaught exception the process state is unknown, so a fresh process replaces it.
  process.on("uncaughtException", (error) => {
    onError(error, "Uncaught exception")
    void stop(1)
  })

  const result = await try$.run(async () => {
    await run()
  })

  if (result instanceof Error) {
    onError(unwrap(result), "Process failed")
    await stop(1)
  }
}

type LifecycleOptions = {
  /**
   * Releases the process's services, such as servers, workers, and connections.
   */
  close: () => Promise<unknown>
  /**
   * Reports an error that the lifecycle catches, with a message that describes when it happened.
   */
  onError: (error: unknown, message: string) => void
  timeoutMs?: number
}
