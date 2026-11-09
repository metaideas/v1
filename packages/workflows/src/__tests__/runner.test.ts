import { setTimeout as sleep } from "node:timers/promises"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { createWorkflows } from "#client.ts"

const connection = { close: vi.fn(() => Promise.resolve()) }
const connect = vi.fn(() => Promise.resolve(connection))

vi.doMock("inngest/connect", () => ({ connect }))

const { createWorkflowsRunner } = await import("#runner.ts")

const logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }

function createRunner() {
  return createWorkflowsRunner({
    client: createWorkflows({ eventKey: "test", id: "test", signingKey: "test" }),
    functions: [],
    logger,
  })
}

beforeEach(() => {
  connection.close.mockClear()
  logger.error.mockClear()
})

describe("createWorkflowsRunner", () => {
  test("closes the connection once it is open", async () => {
    const runner = createRunner()

    runner.connect()
    await sleep(0)
    await runner.close()

    expect(connection.close).toHaveBeenCalledTimes(1)
  })

  test("closes a connection that opens after the runner closes", async () => {
    const { promise, resolve } = Promise.withResolvers<typeof connection>()
    connect.mockImplementationOnce(() => promise)
    const runner = createRunner()

    runner.connect()
    await runner.close()
    resolve(connection)
    await sleep(0)

    expect(connection.close).toHaveBeenCalledTimes(1)
  })

  test("logs a connection that fails", async () => {
    connect.mockImplementationOnce(() => Promise.reject(new Error("refused")))
    const runner = createRunner()

    runner.connect()
    await sleep(0)

    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
