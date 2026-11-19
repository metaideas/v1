import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

const INITIALIZER = join(import.meta.dirname, "..", "index.ts")

let workDir: string

// Points the template's GitHub URL at a repository that doesn't exist, so the clone fails.
function create(directory: string) {
  const gitConfig = join(workDir, "gitconfig")
  writeFileSync(
    gitConfig,
    `[url "file://${join(workDir, "missing.git")}"]\n\tinsteadOf = https://github.com/metaideas/v1.git\n`
  )

  return spawnSync(process.execPath, [INITIALIZER, directory], {
    cwd: workDir,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: gitConfig },
  })
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "create-v1-"))
})

afterEach(() => {
  rmSync(workDir, { force: true, recursive: true })
})

describe("create", () => {
  test("keeps an existing empty directory when the download fails", () => {
    mkdirSync(join(workDir, "my-app"))

    const result = create("my-app")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Could not download metaideas/v1")
    expect(existsSync(join(workDir, "my-app"))).toBe(true)
  })

  test("removes the directory it created when the download fails", () => {
    const result = create("my-app")

    expect(result.status).toBe(1)
    expect(existsSync(join(workDir, "my-app"))).toBe(false)
  })
})
