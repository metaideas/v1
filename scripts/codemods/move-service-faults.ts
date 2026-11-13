/**
 * Moves each package workspace's faults out of `packages/core/src/services/<name>/errors.ts` and
 * into the package that throws them, so removing the package removes its faults.
 *
 * Run `node scripts/codemods/move-service-faults.ts` from the repository root, then `pnpm install`
 * and `pnpm run fix`. For each `<name>` that has both the core folder and `packages/<name>`, it:
 *
 * - Moves `errors.ts` to `packages/<name>/src/errors.ts` with `git mv`, and deletes the core folder's
 *   `index.ts` when it only re-exports `errors.ts`.
 * - Exports `./errors` from the package and adds `@sanely/errors` to its dependencies.
 * - Rewrites the package's imports of `@<scope>/core/errors` to `#errors.ts`.
 * - Removes the folder's lines from `packages/core/src/errors.ts`.
 *
 * A core folder without a matching package, such as `logging`, stays. Running it again changes
 * nothing.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as z from "zod"

const CORE_SERVICES = "packages/core/src/services"
const CORE_ERRORS = "packages/core/src/errors.ts"
const SANELY_ERRORS = "@sanely/errors"

const ManifestSchema = z.looseObject({
  dependencies: z.record(z.string(), z.string()).optional(),
  exports: z.record(z.string(), z.string()).optional(),
  name: z.string(),
})

function readManifest(path: string) {
  return ManifestSchema.parse(JSON.parse(readFileSync(path, "utf8")))
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function sortKeys(record: Record<string, string>) {
  return Object.fromEntries(Object.entries(record).toSorted(([a], [b]) => a.localeCompare(b)))
}

function listTrackedFiles(directory: string) {
  return execFileSync("git", ["ls-files", directory], { encoding: "utf8" })
    .split("\n")
    .filter((file) => /\.tsx?$/.test(file))
}

const core = readManifest("packages/core/package.json")
const scope = core.name.replace(/\/core$/, "")
const sanelyVersion = core.dependencies?.[SANELY_ERRORS]
if (!sanelyVersion)
  throw new Error(`packages/core/package.json does not depend on ${SANELY_ERRORS}`)

const services = readdirSync(CORE_SERVICES).filter(
  (name) =>
    existsSync(join(CORE_SERVICES, name, "errors.ts")) && existsSync(join("packages", name, "src"))
)

for (const name of services) {
  const folder = join(CORE_SERVICES, name)
  const target = join("packages", name, "src/errors.ts")
  execFileSync("git", ["mv", join(folder, "errors.ts"), target])

  const index = join(folder, "index.ts")
  if (
    existsSync(index)
    && readFileSync(index, "utf8").trim() === `export * from "#services/${name}/errors.ts"`
  ) {
    execFileSync("git", ["rm", "--quiet", index])
  }

  const sources = listTrackedFiles(join("packages", name, "src")).map((file) => {
    const source = readFileSync(file, "utf8")
    const rewritten = source.replaceAll(`from "${scope}/core/errors"`, 'from "#errors.ts"')
    if (rewritten !== source) writeFileSync(file, rewritten)
    return rewritten
  })

  // A package that imported core only for its faults no longer depends on it.
  const usesCore = sources.some((source) => source.includes(`"${scope}/core/`))
  const manifestPath = join("packages", name, "package.json")
  const manifest = readManifest(manifestPath)
  const dependencies = Object.entries({ ...manifest.dependencies, [SANELY_ERRORS]: sanelyVersion })
  writeJson(manifestPath, {
    ...manifest,
    dependencies: sortKeys(
      Object.fromEntries(
        dependencies.filter(([dependency]) => usesCore || dependency !== core.name)
      )
    ),
    exports: sortKeys({ ...manifest.exports, "./errors": "./src/errors.ts" }),
  })

  console.info(`Moved ${name} faults to ${target}`)
}

if (existsSync(CORE_ERRORS) && services.length > 0) {
  const moved = new Set(services)
  const registries = new Set(
    services.flatMap((name) =>
      [
        ...readFileSync(join("packages", name, "src/errors.ts"), "utf8").matchAll(
          /export const (\w+Fault) = /g
        ),
      ].map((match) => match[1])
    )
  )
  const lines = readFileSync(CORE_ERRORS, "utf8")
    .split("\n")
    .filter((line) => {
      const service = /"#services\/([^/]+)\/errors\.ts"/.exec(line)?.[1]
      if (service && moved.has(service)) return false
      return !registries.has(line.trim().replace(/,$/, ""))
    })
  writeFileSync(CORE_ERRORS, lines.join("\n"))
}
