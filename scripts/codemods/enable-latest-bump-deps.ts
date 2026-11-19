/**
 * Run `node scripts/codemods/enable-latest-bump-deps.ts` from the repository root.
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
  const rewritten = source.replace(
    /"bump:deps": "pnpm update --interactive(?<recursive> --recursive)?"/,
    '"bump:deps": "pnpm update --interactive --latest$<recursive>"'
  )

  if (rewritten !== source) {
    writeFileSync(file, rewritten)
    console.info(`Updated ${file}`)
  }
}
