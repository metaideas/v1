import { afterAll, describe, expect, mock, test } from "bun:test"
import { createWorkflow } from "@tanstack/workflow-core"
import { inMemoryWorkflowExecutionStore } from "@tanstack/workflow-runtime"
import { WorkflowDefinedAfterLaunchError, WorkflowsNotLaunchedError } from "@v1/core/errors"
import { z } from "zod"

await mock.module("@tanstack/workflow-store-drizzle-postgres", () => ({
  createDrizzlePostgresWorkflowStore: inMemoryWorkflowExecutionStore,
}))

const { createWorkflows } = await import("#client.ts")

const workflows = createWorkflows({ db: { execute: mock() }, sweepIntervalMs: 10 })
const delivered = Promise.withResolvers<number>()

const double = workflows.define(
  createWorkflow({ id: "double", input: z.number() }).handler(async (ctx) => {
    await ctx.sleep(20, { id: "pause" })

    return ctx.step("deliver", () => {
      delivered.resolve(ctx.input * 2)
      return ctx.input * 2
    })
  })
)

afterAll(() => workflows.shutdown())

describe("createWorkflows", () => {
  test("runs a workflow once launched and resumes it after a sleep", async () => {
    expect(() => workflows.run(double, 1)).toThrow(WorkflowsNotLaunchedError)

    workflows.launch()
    workflows.run(double, 21)

    expect(await delivered.promise).toBe(42)
  })

  test("rejects workflows defined after launch", () => {
    const late = createWorkflow({ id: "late" }).handler(() => Promise.resolve(1))

    expect(() => workflows.define(late)).toThrow(WorkflowDefinedAfterLaunchError)
  })
})
