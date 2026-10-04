import { beforeEach, describe, expect, mock, test } from "bun:test"
import { createWorkflows } from "#client.ts"

const connection = { close: mock(() => Promise.resolve()) }
const connect = mock(() => Promise.resolve(connection))

await mock.module("inngest/connect", () => ({ connect }))

const { createWorkflowWorker } = await import("#worker.ts")

const logger = { debug: mock(), error: mock(), info: mock(), warn: mock() }

function createWorker() {
  return createWorkflowWorker({
    functions: [],
    logger,
    workflows: createWorkflows({ eventKey: "test", id: "test", signingKey: "test" }),
  })
}

beforeEach(() => {
  connection.close.mockClear()
  logger.error.mockClear()
})

describe("createWorkflowWorker", () => {
  test("closes the connection once it is open", async () => {
    const worker = createWorker()

    worker.connect()
    await Bun.sleep(0)
    await worker.close()

    expect(connection.close).toHaveBeenCalledTimes(1)
  })

  test("closes a connection that opens after the worker closes", async () => {
    const { promise, resolve } = Promise.withResolvers<typeof connection>()
    connect.mockImplementationOnce(() => promise)
    const worker = createWorker()

    worker.connect()
    await worker.close()
    resolve(connection)
    await Bun.sleep(0)

    expect(connection.close).toHaveBeenCalledTimes(1)
  })

  test("logs a connection that fails", async () => {
    connect.mockImplementationOnce(() => Promise.reject(new Error("refused")))
    const worker = createWorker()

    worker.connect()
    await Bun.sleep(0)

    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
