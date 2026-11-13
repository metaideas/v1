/**
 * Moves test files from `bun:test` to Vitest.
 *
 * Run `node scripts/codemods/bun-test-to-vitest.ts [file...]`. Without arguments, it rewrites every
 * tracked file that imports from `bun:test`.
 *
 * - `import { ..., mock, spyOn } from "bun:test"` imports the same names from `vitest`, with `vi` in
 *   place of `mock` and `spyOn`.
 * - `mock(...)` becomes `vi.fn(...)`, and `spyOn(...)` becomes `vi.spyOn(...)`.
 * - `mock.restore()` becomes `vi.restoreAllMocks()`.
 * - `await mock.module(...)` becomes `vi.doMock(...)`. Unlike `vi.mock`, it isn't hoisted, so it
 *   still applies to the modules that the test imports after it.
 * - `expect(...).toBeFunction()` becomes `expect(...).toBeTypeOf("function")`.
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const BUN_TEST_IMPORT = /^import \{([^}]*)\} from "bun:test"$/m
const REPLACED_IMPORTS = new Set(["mock", "spyOn"])

function rewriteImport(source: string) {
  return source.replace(BUN_TEST_IMPORT, (_line, specifiers: string) => {
    const names = specifiers
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "")

    const kept = names.filter((name) => !REPLACED_IMPORTS.has(name))
    const usesVi = kept.length !== names.length

    return `import { ${[...kept, ...(usesVi ? ["vi"] : [])].join(", ")} } from "vitest"`
  })
}

function rewriteCalls(source: string) {
  return (
    source
      .replaceAll("await mock.module(", "vi.doMock(")
      .replaceAll("mock.restore()", "vi.restoreAllMocks()")
      // A bare call, not a method such as `drizzle.mock()`.
      .replaceAll(/(?<![.\w])mock\(/g, "vi.fn(")
      .replaceAll(/(?<![.\w])spyOn\(/g, "vi.spyOn(")
      .replaceAll(/(\bexpect\(.*\))\.toBeFunction\(\)/g, '$1.toBeTypeOf("function")')
  )
}

const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync("git", ["grep", "-l", "bun:test", "--", "*.ts", "*.tsx"], { encoding: "utf8" })
        .split("\n")
        .filter((file) => file !== "")

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const rewritten = rewriteCalls(rewriteImport(source))

  if (rewritten !== source) {
    writeFileSync(file, rewritten)
    console.info(`Rewrote ${file}`)
  }
}
