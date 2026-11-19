import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, test } from "vitest"

const SETUP = join(import.meta.dirname, "..", "setup.ts")
const directories: string[] = []

// Runs setup in an empty directory, so a check that fails to stop it can't change a real project.
function runSetup(args: readonly string[]) {
  const directory = mkdtempSync(join(tmpdir(), "setup-"))
  directories.push(directory)

  return spawnSync(process.execPath, [SETUP, ...args], { cwd: directory, encoding: "utf8" })
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

describe("setup", () => {
  test.each(["--keep-apps", "--keep-packages"])("rejects a trailing %s with no value", (flag) => {
    const result = runSetup(["--yes", "--name", "demo", flag])

    expect(result.status).toBe(1)
    expect(`${result.stdout}${result.stderr}`).toContain(
      `Provide at least one workspace name with ${flag}.`
    )
  })
})
