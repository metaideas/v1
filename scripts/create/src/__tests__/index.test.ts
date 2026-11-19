import { spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import packageJson from "#package.json" with { type: "json" }

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

  test("stops after installing and points to the v1-setup skill", () => {
    // A local template repository with the release tag, and a pnpm that only records it ran.
    const template = join(workDir, "template")
    const bin = join(workDir, "bin")
    mkdirSync(template)
    mkdirSync(bin)
    writeFileSync(join(template, "package.json"), "{}\n")
    const git = (args: string[]) => spawnSync("git", args, { cwd: template, encoding: "utf8" })
    git(["init", "--quiet"])
    git(["add", "-A"])
    git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "--quiet", "-m", "template"])
    git(["tag", `${packageJson.name}@${packageJson.version}`])
    writeFileSync(join(bin, "pnpm"), '#!/bin/sh\ntouch "$PWD/installed"\n')
    chmodSync(join(bin, "pnpm"), 0o755)

    const gitConfig = join(workDir, "gitconfig")
    writeFileSync(
      gitConfig,
      `[url "file://${template}"]\n\tinsteadOf = https://github.com/metaideas/v1.git\n`
    )
    const result = spawnSync(process.execPath, [INITIALIZER, "my-app"], {
      cwd: workDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: gitConfig,
        PATH: `${bin}:${process.env.PATH ?? ""}`,
      },
    })

    expect(result.status).toBe(0)
    expect(existsSync(join(workDir, "my-app", "installed"))).toBe(true)
    expect(existsSync(join(workDir, "my-app", ".template.json"))).toBe(true)
    expect(result.stdout).toContain("run the v1-setup skill")
  })
})
