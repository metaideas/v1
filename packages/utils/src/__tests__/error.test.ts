import { describe, expect, test } from "bun:test"
import { serializeErrors } from "#error.ts"

class JobError extends Error {
  override name = "JobError"
  code = "E_JOB"
}

describe("serializeErrors", () => {
  test("keeps the name, message, stack, and own properties of an error", () => {
    const error = new JobError("boom")

    expect(serializeErrors({ error })).toEqual({
      error: { code: "E_JOB", message: "boom", name: "JobError", stack: error.stack },
    })
  })

  test("serializes the cause of an error", () => {
    const cause = new TypeError("inner")
    const { error } = serializeErrors({ error: new Error("outer", { cause }) })

    expect(error).toMatchObject({
      cause: { message: "inner", name: "TypeError", stack: cause.stack },
      message: "outer",
    })
  })

  test("serializes errors nested in objects and arrays", () => {
    const serialized = serializeErrors({
      job: { failures: [new RangeError("deep")] },
    })

    expect(serialized).toMatchObject({
      job: { failures: [{ message: "deep", name: "RangeError" }] },
    })
  })

  test("survives a structured clone", () => {
    const serialized = serializeErrors({ error: new JobError("boom") })

    expect(structuredClone(serialized)).toMatchObject({
      error: { code: "E_JOB", message: "boom", name: "JobError" },
    })
  })

  test("leaves other values unchanged", () => {
    const date = new Date(0)
    const map = new Map([["key", "value"]])

    expect(serializeErrors({ count: 2, date, map, message: "plain" })).toEqual({
      count: 2,
      date,
      map,
      message: "plain",
    })
  })

  test("replaces circular references", () => {
    const error = new Error("loop", { cause: { attempt: 1 } })
    Object.assign(error, { self: error })
    const record: Record<string, unknown> = { error }
    record.record = record

    expect(serializeErrors(record)).toMatchObject({
      error: { cause: { attempt: 1 }, self: "[Circular]" },
      record: "[Circular]",
    })
  })
})
