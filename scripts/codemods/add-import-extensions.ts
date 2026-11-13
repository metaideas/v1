/**
 * Adds file extensions to relative imports so Node can resolve them. Node's ESM resolver does not
 * try extensions or `index` files the way Bun does.
 *
 * Run `node scripts/codemods/add-import-extensions.ts [file...]`. Without arguments, it rewrites
 * every tracked TypeScript file in `scripts/`.
 *
 * - `"./shared"` becomes `"./shared.ts"` when `shared.ts` exists beside the importer.
 * - `"./template"` becomes `"./template/index.ts"` when `template/index.ts` exists.
 * - `.tsx` files resolve the same way. A specifier that resolves to no file stays as it is.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const RELATIVE_SPECIFIER =
  /(?<prefix>\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)"(?<path>\.{1,2}\/[^"]+)"/g

const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"] as const

function resolveSpecifier(importer: string, specifier: string) {
  const suffix = CANDIDATES.find((candidate) =>
    existsSync(join(dirname(importer), `${specifier}${candidate}`))
  )

  return suffix === undefined ? specifier : `${specifier}${suffix}`
}

function rewriteImports(file: string, source: string) {
  return source.replaceAll(RELATIVE_SPECIFIER, (match, prefix: string, specifier: string) => {
    const resolved = resolveSpecifier(file, specifier)

    return resolved === specifier ? match : `${prefix}"${resolved}"`
  })
}

const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync("git", ["ls-files", "scripts/*.ts"], { encoding: "utf8" })
        .split("\n")
        .filter((file) => file !== "")

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const rewritten = rewriteImports(file, source)

  if (rewritten !== source) {
    writeFileSync(file, rewritten)
    console.info(`Rewrote ${file}`)
  }
}
