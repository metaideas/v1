import { existsSync, globSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseJSONC } from "confbox"
import { describe, expect, test } from "vitest"

const ROOT = path.join(import.meta.dirname, "..")

type TurboJson = { tasks?: Record<string, { env?: string[] }> }

// The keys an environment contract declares, including the fragments it imports.
function readDeclaredKeys(file: string, seen = new Set<string>()): string[] {
  if (seen.has(file) || !existsSync(file)) return []
  seen.add(file)

  const contents = readFileSync(file, "utf8")
  const keys = [...contents.matchAll(/^(?<key>[A-Z][A-Z0-9_]*)=/gm)].flatMap(
    (match) => match.groups?.key ?? []
  )
  const imports = [...contents.matchAll(/@import\((?<path>[^,)]+)/g)].flatMap((match) =>
    match.groups?.path === undefined ? [] : [path.resolve(path.dirname(file), match.groups.path)]
  )

  return [...keys, ...imports.flatMap((imported) => readDeclaredKeys(imported, seen))]
}

function listEnvPatterns(file: string) {
  const turbo = parseJSONC<TurboJson>(readFileSync(file, "utf8"))

  return Object.values(turbo.tasks ?? {}).flatMap((task) =>
    (task.env ?? []).filter((pattern) => !pattern.startsWith("$"))
  )
}

function matches(pattern: string, key: string) {
  return new RegExp(`^${pattern.replaceAll("*", ".*")}$`).test(key)
}

const workspaces = globSync("{apps,packages}/*/turbo.json", { cwd: ROOT }).map((file) =>
  path.dirname(file)
)

// An application workspace declares its keys in `.env.schema`. A package workspace declares them in
// the fragments under `env/` that applications import.
function readWorkspaceKeys(workspace: string) {
  const contracts = [".env.schema", ...globSync("env/.env.*", { cwd: path.join(ROOT, workspace) })]

  return contracts.flatMap((contract) => readDeclaredKeys(path.join(ROOT, workspace, contract)))
}

describe("turbo.json env", () => {
  test.each(workspaces)(
    "%s lists only keys that its environment contract declares",
    (workspace) => {
      const keys = readWorkspaceKeys(workspace)
      const undeclared = listEnvPatterns(path.join(ROOT, workspace, "turbo.json")).filter(
        (pattern) => !keys.some((key) => matches(pattern, key))
      )

      expect(undeclared).toEqual([])
    }
  )

  test("the root lists only keys that some environment contract declares", () => {
    const keys = workspaces.flatMap((workspace) => readWorkspaceKeys(workspace))
    const undeclared = listEnvPatterns(path.join(ROOT, "turbo.json")).filter(
      (pattern) => !keys.some((key) => matches(pattern, key))
    )

    expect(undeclared).toEqual([])
  })
})
