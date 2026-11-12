import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from "vitest"
import { lifecycle } from "#lifecycle.ts"

const onError = vi.fn()

const hang = () => Promise.withResolvers<undefined>().promise

const idle = () => Promise.resolve()

const EVENTS = ["SIGINT", "SIGTERM", "uncaughtExceptionMonitor"] as const

function countListeners() {
  return Object.fromEntries(EVENTS.map((event) => [event, process.listenerCount(event)]))
}

let counts: ReturnType<typeof countListeners>
let exited: Promise<number | undefined>
let exit: Mock<typeof process.exit>

beforeEach(() => {
  counts = countListeners()
  onError.mockClear()

  let resolveExit: (code: number | undefined) => void
  exited = new Promise((resolve) => {
    resolveExit = resolve
  })
  exit = vi.spyOn(process, "exit").mockImplementation((code) => {
    resolveExit(code === undefined || code === null ? undefined : Number(code))

    return undefined as never
  })
})

afterEach(() => {
  exit.mockRestore()

  // Removes the listeners that the test added, and keeps the test runner's own.
  for (const event of EVENTS) {
    for (const listener of process.listeners(event).slice(counts[event])) {
      process.off(event, listener)
    }
  }
})

describe("lifecycle", () => {
  test("closes and exits with code 0 on SIGTERM", async () => {
    const close = vi.fn(idle)
    await lifecycle(idle, { close, onError })

    process.emit("SIGTERM")

    expect(await exited).toBe(0)
    expect(close).toHaveBeenCalledTimes(1)
  })

  test("logs the original error and exits with code 1 when closing fails", async () => {
    const error = new Error("failed")
    await lifecycle(idle, { close: () => Promise.reject(error), onError })

    process.emit("SIGINT")

    expect(await exited).toBe(1)
    expect(onError).toHaveBeenCalledWith(error, "Process did not stop cleanly")
  })

  test("exits with code 1 when closing runs out of time", async () => {
    await lifecycle(idle, { close: hang, onError, timeoutMs: 10 })

    process.emit("SIGTERM")

    expect(await exited).toBe(1)
  })

  test("leaves a second signal to Node's default and closes once", async () => {
    const close = vi.fn(hang)
    await lifecycle(idle, { close, onError })

    process.emit("SIGTERM")
    process.emit("SIGINT")

    expect(process.listenerCount("SIGINT")).toBe(counts.SIGINT)
    expect(process.listenerCount("SIGTERM")).toBe(counts.SIGTERM)
    expect(close).toHaveBeenCalledTimes(1)
  })

  test.each([
    ["uncaughtException", "Uncaught exception"],
    ["unhandledRejection", "Unhandled promise rejection"],
  ] as const)("logs a crash from %s and leaves the exit to Node", async (origin, message) => {
    const close = vi.fn(idle)
    const error = new Error("crashed")
    await lifecycle(idle, { close, onError })

    process.emit("uncaughtExceptionMonitor", error, origin)

    expect(onError).toHaveBeenCalledWith(error, message)
    expect(close).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })

  test("logs the original error and exits with code 1 without closing when run fails", async () => {
    const close = vi.fn(idle)
    const error = new Error("failed")

    await lifecycle(() => Promise.reject(error), { close, onError })

    expect(await exited).toBe(1)
    expect(onError).toHaveBeenCalledWith(error, "Process failed")
    expect(close).not.toHaveBeenCalled()
  })

  test("exits with code 1 when run fails while it closes", async () => {
    const running = Promise.withResolvers<undefined>()
    const started = lifecycle(() => running.promise, { close: hang, onError })

    process.emit("SIGTERM")
    running.reject(new Error("failed"))
    await started

    expect(await exited).toBe(1)
  })

  test("keeps running after run returns", async () => {
    const close = vi.fn(idle)

    await lifecycle(idle, { close, onError })

    expect(close).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })

  test("closes on a signal while run is still running", async () => {
    const close = vi.fn(idle)
    void lifecycle(hang, { close, onError })

    process.emit("SIGTERM")

    expect(await exited).toBe(0)
    expect(close).toHaveBeenCalledTimes(1)
  })
})
