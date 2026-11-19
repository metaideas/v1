import { describe, expect, test } from "vitest"
import { isAllowedFeatureFile } from "#feature-files.ts"
import { FEATURE_ROLES } from "#workspace.ts"

const feature = "/repo/apps/app/src/features/auth"

describe("isAllowedFeatureFile", () => {
  test("allows role files at the feature root", () => {
    expect(isAllowedFeatureFile(`${feature}/handlers.ts`, FEATURE_ROLES)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/hooks.tsx`, FEATURE_ROLES)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/middleware.ts`, FEATURE_ROLES)).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/schemas.ts`, FEATURE_ROLES)).toBe(true)
  })

  test("allows any file inside assets and components", () => {
    expect(isAllowedFeatureFile(`${feature}/components/sign-up-form.tsx`, FEATURE_ROLES)).toBe(true)
    expect(
      isAllowedFeatureFile(`${feature}/components/fields/email-field.tsx`, FEATURE_ROLES)
    ).toBe(true)
    expect(isAllowedFeatureFile(`${feature}/assets/logo.svg`, FEATURE_ROLES)).toBe(true)
  })

  test("allows a role file split into a folder of the same name", () => {
    expect(isAllowedFeatureFile(`${feature}/handlers/sign-in.ts`, FEATURE_ROLES)).toBe(true)
  })

  test("allows tests beside the files they test", () => {
    expect(isAllowedFeatureFile(`${feature}/__tests__/schemas.test.ts`, FEATURE_ROLES)).toBe(true)
    expect(
      isAllowedFeatureFile(`${feature}/handlers/__tests__/sign-in.test.ts`, FEATURE_ROLES)
    ).toBe(true)
  })

  test("rejects files outside the feature roles", () => {
    expect(isAllowedFeatureFile(`${feature}/utils.ts`, FEATURE_ROLES)).toBe(false)
    expect(isAllowedFeatureFile(`${feature}/server/functions.ts`, FEATURE_ROLES)).toBe(false)
    expect(isAllowedFeatureFile(`${feature}/handlers/server/sign-in.ts`, FEATURE_ROLES)).toBe(false)
  })

  test("rejects roles that the application workspace does not allow", () => {
    const web = ["assets", "components", "constants", "errors", "schemas"] as const

    expect(isAllowedFeatureFile("/repo/apps/web/src/features/blog/middleware.ts", web)).toBe(false)
    expect(isAllowedFeatureFile("/repo/apps/web/src/features/blog/handlers/feed.ts", web)).toBe(
      false
    )
    expect(isAllowedFeatureFile("/repo/apps/web/src/features/blog/schemas.ts", web)).toBe(true)
  })

  test("ignores files outside feature folders", () => {
    expect(isAllowedFeatureFile("/repo/apps/app/src/shared/utils.ts", FEATURE_ROLES)).toBe(true)
    expect(
      isAllowedFeatureFile("/repo/packages/core/src/features/example/utils.ts", FEATURE_ROLES)
    ).toBe(true)
  })
})
