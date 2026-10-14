import { describe, expect, test } from "bun:test"

import {
  commandRunsTurbo,
  readTurboScriptNames,
  turboScriptNames,
  wireRemoteCacheEnv,
  workflowRunsTurbo,
} from "../remote-cache"

const token = ["$", "{{ secrets.TURBO_TOKEN }}"].join("")
const team = ["$", "{{ vars.TURBO_TEAM }}"].join("")

const scripts = turboScriptNames({
  boundaries: "turbo boundaries",
  check: "adamantite check",
  clean: "turbo clean && git clean -xdf .cache .turbo dist node_modules",
  codegen: "turbo run codegen --continue --ui=stream",
  "env:scan": "turbo run env:scan --continue",
  test: "bun test",
})

const testsWorkflow = `name: tests

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  environment:
    steps:
      - run: bun run env:scan
        env:
          VARLOCK_ENV: development

  unit:
    steps:
      - run: bun run codegen
      - run: bun test apps packages tooling scripts turbo
`

function wiredTestsWorkflow() {
  return testsWorkflow.replace(
    "\njobs:\n",
    `\nenv:\n  TURBO_TOKEN: ${token}\n  TURBO_TEAM: ${team}\n\njobs:\n`
  )
}

describe("commandRunsTurbo", () => {
  test("recognizes a Turbo command and ignores a .turbo path", () => {
    expect(commandRunsTurbo("turbo clean && git clean -xdf .cache .turbo dist node_modules")).toBe(
      true
    )
    expect(commandRunsTurbo("git clean -xdf .cache .turbo dist node_modules")).toBe(false)
    expect(commandRunsTurbo("echo turbo build")).toBe(false)
    expect(commandRunsTurbo("bunx turbo run build")).toBe(true)
    expect(commandRunsTurbo("bun --bun turbo generate")).toBe(true)
  })
})

describe("turboScriptNames", () => {
  test("keeps root scripts whose command runs Turbo", () => {
    expect([...scripts].toSorted()).toEqual(["boundaries", "clean", "codegen", "env:scan"])
  })
})

describe("workflowRunsTurbo", () => {
  test("detects Turbo through root scripts and direct commands", () => {
    expect(workflowRunsTurbo(testsWorkflow, scripts)).toBe(true)
    expect(workflowRunsTurbo("run: turbo build\n", scripts)).toBe(true)
    expect(
      workflowRunsTurbo(
        "run: bun run --filter @v1/app build\n",
        turboScriptNames({
          build: "turbo build",
        })
      )
    ).toBe(true)
    expect(workflowRunsTurbo("command: bun run codegen\n", scripts)).toBe(true)
  })

  test("ignores a workflow that only mentions the turbo directory", () => {
    const source =
      "jobs:\n  unit:\n    steps:\n      - run: bun test apps packages tooling scripts turbo\n"
    expect(workflowRunsTurbo(source, scripts)).toBe(false)
  })
})

describe("wireRemoteCacheEnv", () => {
  test("adds the remote cache environment before jobs", () => {
    const result = wireRemoteCacheEnv(testsWorkflow)

    expect(result.status).toBe("added")
    expect(result.source).toBe(wiredTestsWorkflow())
    expect(result.source).toContain(`TURBO_TOKEN: ${token}`)
    expect(result.source).toContain(`TURBO_TEAM: ${team}`)
    expect(result.source).toContain("VARLOCK_ENV: development")
  })

  test("leaves an existing remote cache environment unchanged", () => {
    const wired = wiredTestsWorkflow()
    const result = wireRemoteCacheEnv(wired)

    expect(result.status).toBe("skipped")
    expect(result.source).toBe(wired)
  })

  test("appends missing names to a workflow env block", () => {
    const source = `env:\n  CI: true\n  TURBO_TOKEN: ${token}\n\njobs:\n  unit:\n    steps:\n      - run: bun run codegen\n`
    const result = wireRemoteCacheEnv(source)

    expect(result.status).toBe("updated")
    expect(result.source).toBe(
      `env:\n  CI: true\n  TURBO_TOKEN: ${token}\n  TURBO_TEAM: ${team}\n\njobs:\n  unit:\n    steps:\n      - run: bun run codegen\n`
    )
  })

  test("adds a workflow env block when only a step sets the names", () => {
    const source = `jobs:\n  unit:\n    steps:\n      - run: bun run codegen\n        env:\n          TURBO_TOKEN: ${token}\n          TURBO_TEAM: ${team}\n`
    const result = wireRemoteCacheEnv(source)

    expect(result.status).toBe("added")
    expect(
      result.source.startsWith(`env:\n  TURBO_TOKEN: ${token}\n  TURBO_TEAM: ${team}\n\njobs:\n`)
    ).toBe(true)
    expect(wireRemoteCacheEnv(result.source).status).toBe("skipped")
  })

  test("treats quoted and compact expressions as already wired", () => {
    const source = `env:\n  TURBO_TOKEN: "\${{ secrets.TURBO_TOKEN }}"\n  TURBO_TEAM: '\${{vars.TURBO_TEAM}}'\n\njobs: {}\n`
    expect(wireRemoteCacheEnv(source).status).toBe("skipped")
  })

  test("does not replace a different value", () => {
    const source = `env:\n  TURBO_TOKEN: not-a-real-token\n  TURBO_TEAM: ${team}\n\njobs: {}\n`
    const result = wireRemoteCacheEnv(source)

    expect(result.status).toBe("manual")
    expect(result.source).toBe(source)
    expect(result.detail).not.toContain("not-a-real-token")
  })

  test("does not rewrite a one-line env map", () => {
    const source = "env: { CI: true }\n\njobs:\n  unit:\n    steps:\n      - run: turbo build\n"
    const result = wireRemoteCacheEnv(source)

    expect(result.status).toBe("manual")
    expect(result.source).toBe(source)
  })
})

describe("repository workflows", () => {
  test("sees the Turbo scripts GitHub Actions calls", async () => {
    const names = await readTurboScriptNames()

    expect(names.has("boundaries")).toBe(true)
    expect(names.has("codegen")).toBe(true)
    expect(names.has("env:scan")).toBe(true)
    expect(names.has("check")).toBe(false)
    expect(names.has("test")).toBe(false)
  })

  test("keeps the remote cache environment on workflows that run Turbo", async () => {
    const names = await readTurboScriptNames()
    const turboWorkflows: string[] = []

    for await (const name of new Bun.Glob("*.{yml,yaml}").scan({ cwd: ".github/workflows" })) {
      const source = await Bun.file(`.github/workflows/${name}`).text()
      if (!workflowRunsTurbo(source, names)) continue

      turboWorkflows.push(name)
      expect(wireRemoteCacheEnv(source).status).toBe("skipped")
      expect(source).toContain(`TURBO_TOKEN: ${token}`)
      expect(source).toContain(`TURBO_TEAM: ${team}`)
      expect(source).not.toContain("metaideas")
    }

    expect(turboWorkflows).toContain("tests.yml")
    const pullfrog = await Bun.file(".github/workflows/pullfrog.yml").text()
    expect(workflowRunsTurbo(pullfrog, names)).toBe(false)
  })
})
