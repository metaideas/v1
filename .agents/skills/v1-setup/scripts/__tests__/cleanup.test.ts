import { describe, expect, test } from "vitest"

import { checkIsRemovedByCleanup, checkIsTemplateReadme } from "../cleanup.ts"

const ROOT_DIR = "/project"

describe("checkIsRemovedByCleanup", () => {
  test("matches a cleanup path that names the file", () => {
    expect(
      checkIsRemovedByCleanup(ROOT_DIR, "docs/coding-standards.md", ["docs/coding-standards.md"])
    ).toBe(true)
  })

  test("matches a dot-prefixed cleanup path that setup resolves to the same file", () => {
    expect(
      checkIsRemovedByCleanup(ROOT_DIR, "docs/coding-standards.md", ["./docs/coding-standards.md"])
    ).toBe(true)
  })

  test("matches a cleanup path that names a parent folder", () => {
    expect(checkIsRemovedByCleanup(ROOT_DIR, "docs/coding-standards.md", ["docs"])).toBe(true)
    expect(checkIsRemovedByCleanup(ROOT_DIR, "docs/coding-standards.md", ["./docs/"])).toBe(true)
  })

  test("ignores a cleanup path that only shares a prefix", () => {
    expect(
      checkIsRemovedByCleanup(ROOT_DIR, "docs/coding-standards.md", ["docs/coding", "doc"])
    ).toBe(false)
  })
})

describe("checkIsTemplateReadme", () => {
  test("accepts a README that setup wrote for the project", () => {
    const readme = "# my-app\n\nTracks orders.\n\n## Workspaces\n\n- `apps/app`: web application\n"

    expect(checkIsTemplateReadme(readme)).toBe(false)
  })
})
