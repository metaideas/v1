import { afterEach, beforeEach, describe, expect, type Mock, mock, spyOn, test } from "bun:test"
import { handleLifecycle } from "#lifecycle.ts"

const logger = { debug: mock(), error: mock(), info: mock(), warn: mock() }

const hang = () => Promise.withResolvers<undefined>().promise

function countListeners() {
  return {
    SIGINT: process.listenerCount("SIGINT"),
    SIGTERM: process.listenerCount("SIGTERM"),
    uncaughtException: process.listenerCount("uncaughtException"),
    unhandledRejection: process.listenerCount("unhandledRejection"),
  }
}

let counts: ReturnType<typeof countListeners>
let exited: Promise<number | undefined>
let exit: Mock<typeof process.exit>

beforeEach(() => {
  counts = countListeners()
  logger.error.mockClear()

  let resolveExit: (code: number | undefined) => void
  exited = new Promise((resolve) => {
    resolveExit = resolve
  })
  exit = spyOn(process, "exit").mockImplementation((code) => {
    resolveExit(code === undefined || code === null ? undefined : Number(code))

    return undefined as never
  })
})

afterEach(() => {
  exit.mockRestore()

  // Removes the listeners that the test added, and keeps the test runner's own.
  for (const listener of process.listeners("SIGINT").slice(counts.SIGINT)) {
    process.off("SIGINT", listener)
  }
  for (const listener of process.listeners("SIGTERM").slice(counts.SIGTERM)) {
    process.off("SIGTERM", listener)
  }
  for (const listener of process.listeners("uncaughtException").slice(counts.uncaughtException)) {
    process.off("uncaughtException", listener)
  }
  for (const listener of process.listeners("unhandledRejection").slice(counts.unhandledRejection)) {
    process.off("unhandledRejection", listener)
  }
})

describe("handleLifecycle", () => {
  test("closes and exits with code 0 on SIGTERM", async () => {
    const close = mock(() => Promise.resolve())
    handleLifecycle({ close, logger, scope: "test" })

    process.emit("SIGTERM")

    expect(await exited).toBe(0)
    expect(close).toHaveBeenCalledTimes(1)
  })

  test("exits with code 1 when closing fails", async () => {
    handleLifecycle({ close: () => Promise.reject(new Error("closed")), logger, scope: "test" })

    process.emit("SIGINT")

    expect(await exited).toBe(1)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  test("exits with code 1 when closing runs out of time", async () => {
    handleLifecycle({ close: hang, logger, scope: "test", timeoutMs: 10 })

    process.emit("SIGTERM")

    expect(await exited).toBe(1)
  })

  test("closes and exits with code 1 after an uncaught exception", async () => {
    const close = mock(() => Promise.resolve())
    handleLifecycle({ close, logger, scope: "test" })

    process.emit("uncaughtException", new Error("thrown"))

    expect(await exited).toBe(1)
    expect(close).toHaveBeenCalledTimes(1)
  })

  test("logs an unhandled rejection and keeps running", () => {
    const close = mock(() => Promise.resolve())
    handleLifecycle({ close, logger, scope: "test" })

    process.emit("unhandledRejection", new Error("rejected"), Promise.resolve())

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })

  test("closes once when it stops more than once", async () => {
    const close = mock(() => Promise.resolve())
    const lifecycle = handleLifecycle({ close, logger, scope: "test" })

    await Promise.all([lifecycle.stop(1), lifecycle.stop(0)])

    expect(close).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith(1)
  })
})
