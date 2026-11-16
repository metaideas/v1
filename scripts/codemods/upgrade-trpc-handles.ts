/**
 * Aligns tRPC and TanStack Query for the handles API. Run `node
 * scripts/codemods/upgrade-trpc-handles.ts [package.json...]`. Without arguments, it updates the
 * application and package workspace manifests.
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const UPGRADES = [
  ["@trpc/server", "11.19.0", "11.28.2"],
  ["@tanstack/react-query", "5.104.1", "5.107.1"],
  ["@tanstack/react-query-devtools", "5.104.1", "5.107.1"],
  ["@tanstack/query-async-storage-persister", "5.104.1", "5.107.1"],
  ["@tanstack/react-query-persist-client", "5.104.1", "5.107.1"],
] as const

const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync("git", ["ls-files", "apps/*/package.json", "packages/*/package.json"], {
        encoding: "utf8",
      })
        .split("\n")
        .filter((file) => file !== "")

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const rewritten = UPGRADES.reduce(
    (contents, [name, previous, next]) =>
      contents.replaceAll(`"${name}": "${previous}"`, `"${name}": "${next}"`),
    source
  )

  if (rewritten !== source) {
    writeFileSync(file, rewritten)
    console.info(`Updated ${file}`)
  }
}
