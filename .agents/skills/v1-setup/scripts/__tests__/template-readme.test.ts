import { readFileSync } from "node:fs"

import { describe, expect, test } from "vitest"

import { checkIsTemplateReadme } from "../cleanup.ts"

// Setup rewrites README.md and removes the v1-setup skill with this test, so it runs only in the
// template.
describe("checkIsTemplateReadme", () => {
  test("recognizes the template's own README", () => {
    const readme = readFileSync(new URL("../../../../../README.md", import.meta.url), "utf8")

    expect(checkIsTemplateReadme(readme)).toBe(true)
  })
})
