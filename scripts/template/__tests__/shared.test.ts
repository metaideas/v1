import { describe, expect, test } from "vitest"

import {
  checkIsRemovedByCleanup,
  checkIsTemplateReadme,
  findPackageOwnedCoreServices,
  findUnknownKnipWorkspaces,
} from "../shared.ts"

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

describe("findUnknownKnipWorkspaces", () => {
  const workspacePaths = new Set(["apps/api", "apps/mobile", "packages/database"])

  test("lists a configured workspace that does not exist", () => {
    expect(
      findUnknownKnipWorkspaces(
        { workspaces: { "apps/mobile": {}, "packages/jobs": {} } },
        workspacePaths
      )
    ).toEqual(["packages/jobs"])
  })

  test("ignores globs, tooling workspaces, and paths outside the workspaces block", () => {
    expect(
      findUnknownKnipWorkspaces(
        {
          ignoreIssues: { "apps/api/src/shared/context.ts": ["exports"] },
          workspaces: { ".": {}, "apps/*": {}, "packages/database": {}, "tooling/linting": {} },
        },
        workspacePaths
      )
    ).toEqual([])
  })
})

describe("findPackageOwnedCoreServices", () => {
  const packageNames = new Set(["core", "email", "jobs"])

  test("lists a core service named after a package workspace", () => {
    expect(findPackageOwnedCoreServices(["email", "jobs", "logging"], packageNames)).toEqual([
      "email",
      "jobs",
    ])
  })

  test("keeps a contract that no single package owns", () => {
    expect(findPackageOwnedCoreServices(["logging"], packageNames)).toEqual([])
  })
})

describe("checkIsTemplateReadme", () => {
  test("accepts a README that setup wrote for the project", () => {
    const readme = "# my-app\n\nTracks orders.\n\n## Workspaces\n\n- `apps/app`: web application\n"

    expect(checkIsTemplateReadme(readme)).toBe(false)
  })
})
