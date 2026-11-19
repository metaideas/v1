/**
 * Run `node scripts/codemods/centralize-bump-deps.ts` from the repository root.
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const files = execFileSync(
  "git",
  [
    "ls-files",
    "-z",
    "package.json",
    ":(glob)apps/*/package.json",
    ":(glob)packages/*/package.json",
    "scripts/create/package.json",
    ":(glob)tooling/*/package.json",
    "turbo/generators/templates/scaffolds/new-package/package.package.json.hbs",
  ],
  { encoding: "utf8" }
)
  .split("\0")
  .filter(Boolean)

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const rewritten =
    file === "package.json"
      ? source.replace(
          '"bump:deps": "pnpm update --interactive --recursive"',
          '"bump:deps": "pnpm update --interactive --latest --recursive"'
        )
      : source.replace(/^ {4}"bump:deps": "pnpm update --interactive(?: --latest)?",\n/m, "")

  if (rewritten !== source) {
    writeFileSync(file, rewritten)
    console.info(`Updated ${file}`)
  }
}
