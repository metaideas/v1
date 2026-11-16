/**
 * Rewrites Bun commands in Markdown files to their pnpm equivalents. It leaves prose about Bun
 * alone and prints each line that still mentions Bun, so those lines can be rewritten by hand.
 *
 * Run `node scripts/codemods/bun-commands-to-pnpm.ts [file...]`. Without arguments, it rewrites
 * every tracked Markdown file.
 *
 * - `bun run --filter web dev` becomes `pnpm --filter web run dev`.
 * - `bun add --exact <name>` becomes `pnpm add <name>`, because `pnpm-workspace.yaml` sets
 *   `saveExact`.
 * - `bun run`, `bun template`, `bun install`, and `bun add` become the same pnpm command.
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const REWRITES = [
  [/\bbun run --filter[ =](?<workspace>\S+) (?<script>[\w:-]+)/g, "pnpm --filter $1 run $2"],
  [/\bbun add --exact\b/g, "pnpm add"],
  [/\bbun (?<command>run|template|install|add)\b/g, "pnpm $1"],
] as const

const BUN_MENTION = /\bbunx?\b/i

const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync("git", ["ls-files", "*.md"], { encoding: "utf8" }).split("\n").filter(Boolean)

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const rewritten = REWRITES.reduce(
    (text, [pattern, replacement]) => text.replaceAll(pattern, replacement),
    source
  )

  if (rewritten !== source) {
    writeFileSync(file, rewritten)
    console.info(`Rewrote ${file}`)
  }

  for (const [index, line] of rewritten.split("\n").entries()) {
    if (BUN_MENTION.test(line)) console.info(`Still mentions Bun: ${file}:${index + 1}`)
  }
}
