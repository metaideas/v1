import { beforeEach, describe, expect, mock, test } from "bun:test"
import { createWorkflows } from "#client.ts"

const connection = { close: mock(() => Promise.resolve()) }
const connect = mock(() => Promise.resolve(connection))

await mock.module("inngest/connect", () => ({ connect }))

const { createWorkflowsRunner } = await import("#runner.ts")

const logger = { debug: mock(), error: mock(), info: mock(), warn: mock() }

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
    await Bun.sleep(0)
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
    await Bun.sleep(0)

    expect(connection.close).toHaveBeenCalledTimes(1)
  })

  test("logs a connection that fails", async () => {
    connect.mockImplementationOnce(() => Promise.reject(new Error("refused")))
    const runner = createRunner()

    runner.connect()
    await Bun.sleep(0)

    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
