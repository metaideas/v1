import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vitest"
import * as z from "zod"

import {
  checkIsRemovedByCleanup,
  TemplateCleanupSchema,
  removeTemplateSections,
  TEMPLATE_SECTION_START,
} from "../cleanup.ts"

const ROOT = join(import.meta.dirname, "../../../../..")
const { cleanupPaths, cleanupSections } = z
  .object({ v1: TemplateCleanupSchema })
  .parse(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"))).v1

// Setup removes the v1-setup skill with these tests, so they run only in the template.
describe("v1 cleanup lists", () => {
  test("cleanupPaths lists only paths that exist", () => {
    expect(cleanupPaths.filter((path) => !existsSync(join(ROOT, path)))).toEqual([])
  })

  test("cleanupSections lists only files with a TEMPLATE:START marker", () => {
    const unmarked = cleanupSections.filter(
      (path) => !readFileSync(join(ROOT, path), "utf8").includes(TEMPLATE_SECTION_START)
    )

    expect(unmarked).toEqual([])
  })

  test("AGENTS.md keeps no reference to a doc that setup removes", () => {
    const agents = removeTemplateSections(readFileSync(join(ROOT, "AGENTS.md"), "utf8"))
    const removed = [...new Set(agents.match(/docs\/[\w-]+\.md/g))].filter((path) =>
      checkIsRemovedByCleanup(ROOT, path, cleanupPaths)
    )

    expect(removed).toEqual([])
  })
})
