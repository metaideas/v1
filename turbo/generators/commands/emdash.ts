import type { PlopTypes } from "@turbo/gen"
import type { ImportItemInput } from "magicast"
import Bun from "bun"

import { addImports } from "../imports"
import { readPackageJson } from "../schemas"

type Edit = {
  path: string
  marker: string
  imports?: readonly ImportItemInput[]
  replacements: ReadonlyArray<readonly [anchor: string, replacement: string]>
  manual: string
}

const WEB_PATH = "apps/web"

const ENVIRONMENT = `
# Key that encrypts EmDash plugin secrets. Generate one with \`bunx emdash secrets generate\`.
# @optional @sensitive
EMDASH_ENCRYPTION_KEY=
`

// The SQLite database and uploaded media hold content, and EmDash rewrites the migration manifest
// on every build. The dev server writes emdash-env.d.ts from the content model, so it stays tracked.
const IGNORED_PATHS = [".emdash/migrations.json", "data.db*", "uploads"] as const

// The Node adapter serves EmDash's admin and API on demand, and `output: "static"` keeps every
// existing page prerendered.
const EDITS: readonly Edit[] = [
  {
    imports: [
      { from: "@astrojs/node", imported: "default", local: "node" },
      { from: "emdash/astro", imported: "default", local: "emdash" },
      { from: "emdash/astro", imported: "local" },
      { from: "emdash/db", imported: "sqlite" },
    ],
    manual:
      'Add `adapter: node({ mode: "standalone" })` and the `emdash()` integration with `sqlite()` and `local()` storage to astro.config.ts.',
    marker: "emdash({",
    path: "astro.config.ts",
    replacements: [
      ['  output: "static",\n', '  adapter: node({ mode: "standalone" }),\n  output: "static",\n'],
      [
        "    mdx(),\n",
        '    mdx(),\n    emdash({\n      database: sqlite({ url: "file:./data.db" }),\n      storage: local({ baseUrl: "/_emdash/api/media/file", directory: "./uploads" }),\n    }),\n',
      ],
    ],
  },
  {
    manual: 'Add "emdash-env.d.ts" to the `include` list in tsconfig.json.',
    marker: '"emdash-env.d.ts"',
    path: "tsconfig.json",
    replacements: [['".astro/types.d.ts", ', '".astro/types.d.ts", "emdash-env.d.ts", ']],
  },
  {
    manual: 'Add a `"start": "varlock run -- node dist/server/entry.mjs"` script to package.json.',
    marker: '"start":',
    path: "package.json",
    replacements: [
      [
        '    "preview": "astro preview"\n',
        '    "preview": "astro preview",\n    "start": "varlock run -- node dist/server/entry.mjs"\n',
      ],
    ],
  },
]

async function applyEdit(path: string, edit: Edit) {
  const file = Bun.file(path)

  if (!(await file.exists())) {
    return `[MANUAL] ${path} is missing. ${edit.manual}`
  }

  let source = await file.text()

  if (source.includes(edit.marker)) {
    return `[SKIPPED] ${path} already uses EmDash`
  }

  if (edit.replacements.some(([anchor]) => !source.includes(anchor))) {
    return `[MANUAL] ${path} changed since generation. ${edit.manual}`
  }

  for (const [anchor, replacement] of edit.replacements) {
    source = source.replace(anchor, replacement)
  }

  if (edit.imports) {
    const sourceWithImports = addImports(source, edit.imports)
    if (sourceWithImports === undefined) {
      return `[MANUAL] ${path} already binds a name this edit imports. ${edit.manual}`
    }

    source = sourceWithImports
  }

  await Bun.write(path, source)
  return `${path}: connected EmDash`
}

async function addEnvironment() {
  const schemaPath = `${WEB_PATH}/.env.schema`
  const schema = await Bun.file(schemaPath).text()
  const missing = ENVIRONMENT.trim()
    .split("\n\n")
    .filter((declaration) => {
      const key = /^([A-Z0-9_]+)=/m.exec(declaration)?.[1]
      return key !== undefined && !new RegExp(`^${key}=`, "m").test(schema)
    })

  if (missing.length === 0) {
    return `[SKIPPED] ${schemaPath} already declares the EmDash variables`
  }

  await Bun.write(schemaPath, `${schema.trimEnd()}\n\n${missing.join("\n\n")}\n`)
  return `${schemaPath}: added the optional EmDash variables`
}

async function ignoreContent() {
  const path = `${WEB_PATH}/.gitignore`
  const file = Bun.file(path)
  const source = (await file.exists()) ? await file.text() : ""
  const lines = new Set(source.split("\n").map((line) => line.trim()))
  const missing = IGNORED_PATHS.filter((entry) => !lines.has(entry))

  if (missing.length === 0) {
    return `[SKIPPED] ${path} already ignores the EmDash content`
  }

  const prefix = source.trim() === "" ? "" : `${source.trimEnd()}\n\n`
  await Bun.write(path, `${prefix}# EmDash\n${missing.join("\n")}\n`)
  return `${path}: ignored the EmDash database, uploads, and migration manifest`
}

export function registerEmDashGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator("emdash", {
    actions: () => [
      async () => {
        if (!(await Bun.file(`${WEB_PATH}/package.json`).exists())) {
          throw new Error(`EmDash needs ${WEB_PATH}. Add it with bun template add.`)
        }

        const web = await readPackageJson(`${WEB_PATH}/package.json`)

        if ("emdash" in { ...web.dependencies, ...web.devDependencies }) {
          return `[SKIPPED] ${WEB_PATH} already contains EmDash`
        }

        await Bun.$`cd ${WEB_PATH} && bun add --exact emdash @astrojs/node`
        return `${WEB_PATH}: installed EmDash and the Astro Node adapter`
      },
      {
        path: `${WEB_PATH}/src/live.config.ts`,
        skipIfExists: true,
        templateFile: "templates/emdash/web-live.config.ts.hbs",
        type: "add",
      },
      addEnvironment,
      ignoreContent,
      ...EDITS.map((edit) => () => applyEdit(`${WEB_PATH}/${edit.path}`, edit)),
      () =>
        "Run `bun run --filter web dev`, open /_emdash/admin/, and finish the setup wizard. Commit the emdash-env.d.ts it writes.",
      () =>
        'Query content with `getEmDashCollection()` from "emdash" in a page that sets `export const prerender = false`.',
      () =>
        `The Node adapter and SQLite need a server with a persistent disk. Run \`bun run --filter web build\`, then \`bun run --filter web start\`, and remove ${WEB_PATH}/vercel.json if you no longer deploy to Vercel.`,
      () => "Run `bun run codegen` and `bun run fix`, then `bun template doctor`.",
    ],
    description: "Add the EmDash CMS to apps/web",
    prompts: [],
  })
}
