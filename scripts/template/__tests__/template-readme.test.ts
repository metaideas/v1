import { readFileSync } from "node:fs"

import { describe, expect, test } from "vitest"

import { checkIsTemplateReadme } from "../shared.ts"

// Setup rewrites README.md and removes this file, so the test runs only in the template.
describe("checkIsTemplateReadme", () => {
  test("recognizes the template's own README", () => {
    const readme = readFileSync(new URL("../../../README.md", import.meta.url), "utf8")

    expect(checkIsTemplateReadme(readme)).toBe(true)
  })
})
