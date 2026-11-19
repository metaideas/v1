import { describe, expect, test } from "vitest"
import { importsEnvValue, isPackageSource } from "#package-env.ts"

describe("importsEnvValue", () => {
  test("reports a value import of the generated ENV binding", () => {
    expect(importsEnvValue("#shared/env.generated.ts", "value", ["value"])).toBe(true)
    expect(importsEnvValue("../env.generated", undefined, [undefined])).toBe(true)
    expect(importsEnvValue("#env.generated.ts", undefined, [undefined])).toBe(true)
  })

  test("allows type-only imports, which are erased", () => {
    expect(importsEnvValue("#shared/env.generated.ts", "type", [undefined])).toBe(false)
    expect(importsEnvValue("#shared/env.generated.ts", "value", ["type"])).toBe(false)
  })

  test("reports a re-export of the binding", () => {
    expect(importsEnvValue("./env.generated.ts", "value", [])).toBe(true)
  })

  test("ignores other modules", () => {
    expect(importsEnvValue("#shared/environment.ts", "value", [undefined])).toBe(false)
  })
})

describe("isPackageSource", () => {
  test("matches only package workspace source", () => {
    expect(isPackageSource("/repo/packages/jobs/src/runner.ts")).toBe(true)
    expect(isPackageSource("/repo/apps/api/src/shared/services.ts")).toBe(false)
  })
})
