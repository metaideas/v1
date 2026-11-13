import { ms } from "@sanely/duration"
import * as try$ from "@sanely/try"
import { isUnhandledException } from "@sanely/try/errors"

// Below the 30 seconds that Kubernetes and most platforms allow between SIGTERM and SIGKILL.
const DEFAULT_TIMEOUT_MS = ms("25s")

const SIGNALS = ["SIGINT", "SIGTERM"] as const

const CRASHES = {
  uncaughtException: "Uncaught exception",
  unhandledRejection: "Unhandled promise rejection",
} as const satisfies Record<NodeJS.UncaughtExceptionOrigin, string>

// @sanely/try wraps an error that it does not map, which hides the original in the log. A thrown
// value that is not an Error stays wrapped, so the log still gets a stack.
function unwrap(error: Error) {
  return isUnhandledException(error) && error.cause instanceof Error ? error.cause : error
}

/**
 * Starts a server process with `run`. The process keeps running after `run` returns. On the first
 * SIGINT or SIGTERM, `close` gets `timeoutMs` to release the process's services, and the process
 * exits with code 0, or with code 1 when `close` fails or runs out of time. A second signal ends
 * the process at once.
 *
 * A failed `run`, an uncaught exception, or an unhandled rejection goes to `onError`, and the
 * process exits with code 1 without closing, because its state is unknown. The process supervisor
 * starts a fresh one.
 *
 * Resolves once `run` settles.
 */
export async function lifecycle(
  run: () => Promise<void>,
  { close, onError, timeoutMs = DEFAULT_TIMEOUT_MS }: LifecycleOptions
) {
  async function stop() {
    const closed = await try$.timeout(timeoutMs).run(() => close())

    if (closed instanceof Error) {
      onError(unwrap(closed), "Process did not stop cleanly")
    }

    process.exit(closed instanceof Error ? 1 : 0)
  }

  function handleSignal() {
    // Without these listeners, a second signal gets Node's default and ends the process at once.
    for (const signal of SIGNALS) {
      process.off(signal, handleSignal)
    }

    void stop()
  }

  for (const signal of SIGNALS) {
    process.on(signal, handleSignal)
  }

  // A monitor reports the crash and leaves Node's default in place, which exits with code 1.
  process.on("uncaughtExceptionMonitor", (error, origin) => {
    onError(error, CRASHES[origin])
  })

  const result = await try$.run(async () => {
    await run()
  })

  if (result instanceof Error) {
    onError(unwrap(result), "Process failed")
    process.exit(1)
  }
}

type LifecycleOptions = {
  /**
   * Releases the process's services, such as servers, workers, and connections.
   */
  close: () => Promise<void>
  /**
   * Reports an error that the lifecycle catches, with a message that describes when it happened.
   */
  onError: (error: Error, message: string) => void
  timeoutMs?: number
}
