import { afterEach, beforeEach, describe, expect, type Mock, mock, spyOn, test } from "bun:test"
import { lifecycle } from "#lifecycle.ts"

const logger = { debug: mock(), error: mock(), info: mock(), warn: mock() }

const hang = () => Promise.withResolvers<undefined>().promise

const idle = () => Promise.resolve()

const fail = () => Promise.reject(new Error("failed"))

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

describe("lifecycle", () => {
  test("closes and exits with code 0 on SIGTERM", async () => {
    const close = mock(() => Promise.resolve())
    await lifecycle(idle, { close, logger, scope: "test" })

    process.emit("SIGTERM")

    expect(await exited).toBe(0)
    expect(close).toHaveBeenCalledTimes(1)
  })

  test("exits with code 1 when closing fails", async () => {
    await lifecycle(idle, { close: fail, logger, scope: "test" })

    process.emit("SIGINT")

    expect(await exited).toBe(1)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  test("exits with code 1 when closing runs out of time", async () => {
    await lifecycle(idle, { close: hang, logger, scope: "test", timeoutMs: 10 })

    process.emit("SIGTERM")

    expect(await exited).toBe(1)
  })

  test("closes and exits with code 1 after an uncaught exception", async () => {
    const close = mock(() => Promise.resolve())
    await lifecycle(idle, { close, logger, scope: "test" })

    process.emit("uncaughtException", new Error("thrown"))

    expect(await exited).toBe(1)
    expect(close).toHaveBeenCalledTimes(1)
  })

  test("closes and exits with code 1 when run fails", async () => {
    const close = mock(() => Promise.resolve())

    await lifecycle(fail, { close, logger, scope: "test" })

    expect(await exited).toBe(1)
    expect(close).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  test("keeps running after run returns", async () => {
    const close = mock(() => Promise.resolve())

    await lifecycle(idle, { close, logger, scope: "test" })

    expect(close).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })

  test("logs an unhandled rejection and keeps running", async () => {
    const close = mock(() => Promise.resolve())
    await lifecycle(idle, { close, logger, scope: "test" })

    process.emit("unhandledRejection", new Error("rejected"), Promise.resolve())

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })

  test("closes once when it stops more than once", async () => {
    const close = mock(() => Promise.resolve())
    await lifecycle(idle, { close, logger, scope: "test" })

    process.emit("uncaughtException", new Error("thrown"))
    process.emit("SIGTERM")

    expect(await exited).toBe(1)
    expect(close).toHaveBeenCalledTimes(1)
  })
  test("exits with code 1 when an uncaught exception arrives while it closes", async () => {
    const closing = Promise.withResolvers<undefined>()
    await lifecycle(idle, { close: () => closing.promise, logger, scope: "test" })

    process.emit("SIGTERM")
    process.emit("uncaughtException", new Error("thrown"))
    closing.resolve()

    expect(await exited).toBe(1)
  })

  test("exits with code 1 when run fails while it closes", async () => {
    const closing = Promise.withResolvers<undefined>()
    const running = Promise.withResolvers<undefined>()
    const started = lifecycle(() => running.promise, {
      close: () => closing.promise,
      logger,
      scope: "test",
    })

    process.emit("SIGTERM")
    running.reject(new Error("failed"))
    await Bun.sleep(0)
    closing.resolve()
    await started

    expect(await exited).toBe(1)
  })

  test("exits at once with code 1 on a second signal of another kind", async () => {
    const close = mock(hang)
    await lifecycle(idle, { close, logger, scope: "test" })

    process.emit("SIGTERM")
    process.emit("SIGINT")

    expect(await exited).toBe(1)
    expect(close).toHaveBeenCalledTimes(1)
  })

  test("logs the original error when run fails", async () => {
    const error = new Error("failed")

    await lifecycle(() => Promise.reject(error), { close: idle, logger, scope: "test" })

    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error }))
  })
})
