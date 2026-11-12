import { describe, expect, test } from "vitest"
import { ThrownStatus, resolveErrorStatus } from "#shared/server/error-status.ts"

describe("resolveErrorStatus", () => {
  test("prefers an error status set through a response helper", () => {
    expect(
      resolveErrorStatus(
        ThrownStatus.parse(Object.assign(new Error("failed"), { status: 422 })),
        409
      )
    ).toBe(409)
  })

  test("ignores a success status set through a response helper", () => {
    expect(resolveErrorStatus(ThrownStatus.parse(new Error("failed")), 200)).toBe(500)
  })

  test("reads the status of a wrapped error from its cause", () => {
    expect(
      resolveErrorStatus(ThrownStatus.parse(new Error("failed", { cause: { status: 422 } })), 200)
    ).toBe(422)
  })

  test("reads statusCode and numeric strings", () => {
    expect(resolveErrorStatus(ThrownStatus.parse({ statusCode: "418" }), 200)).toBe(418)
  })

  test("uses the first status property even when it is not an error status", () => {
    expect(resolveErrorStatus(ThrownStatus.parse({ status: 200, statusCode: 418 }), 200)).toBe(500)
  })

  test("answers 500 for an error without a status", () => {
    expect(resolveErrorStatus(ThrownStatus.parse("failed"), 200)).toBe(500)
  })
})
