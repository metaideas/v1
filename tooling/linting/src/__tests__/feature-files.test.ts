import { describe, expect, test } from "bun:test"
import { isAllowedFeatureFile } from "#feature-files.ts"

const feature = "/repo/apps/app/src/features/auth"

describe("isAllowedFeatureFile", () => {
  test("allows role files at the feature root", () => {
    expect(isAllowedFeatureFile(`${feature}/handlers.ts`)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/hooks.tsx`)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/middleware.ts`)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/schemas.ts`)).toBe(true)
  })

  test("allows any file inside assets and components", () => {
    expect(isAllowedFeatureFile(`${feature}/components/sign-up-form.tsx`)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/components/fields/email-field.tsx`)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/assets/logo.svg`)).toBe(true)
  })

  test("allows a role file split into a folder of the same name", () => {
    expect(isAllowedFeatureFile(`${feature}/handlers/sign-in.ts`)).toBe(true)
  })

  test("allows tests beside the files they test", () => {
    expect(isAllowedFeatureFile(`${feature}/__tests__/schemas.test.ts`)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/handlers/__tests__/sign-in.test.ts`)).toBe(true)
  })

  test("rejects files outside the feature roles", () => {
    expect(isAllowedFeatureFile(`${feature}/utils.ts`)).toBe(false)
    expect(isAllowedFeatureFile(`${feature}/server/functions.ts`)).toBe(false)
    expect(isAllowedFeatureFile(`${feature}/handlers/server/sign-in.ts`)).toBe(false)
  })

  test("ignores files outside feature folders", () => {
    expect(isAllowedFeatureFile("/repo/apps/app/src/shared/utils.ts")).toBe(true)
    expect(isAllowedFeatureFile("/repo/packages/core/src/features/example/utils.ts")).toBe(true)
  })
})
