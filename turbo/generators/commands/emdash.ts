import type { PlopTypes } from "@turbo/gen"
import type { ImportItemInput } from "magicast"
import Bun from "bun"

import { addImports } from "../imports"
import { readPackageJson, readPackageName } from "../schemas"

type Edit = {
  path: string
  marker: string
  imports?: readonly ImportItemInput[]
  replacements: ReadonlyArray<readonly [anchor: string, replacement: string]>
  manual: string
}

const WEB_PATH = "apps/web"
const DATABASE_PATH = "packages/database"
const MIGRATIONS_PATH = `${DATABASE_PATH}/migrations`
const SCHEMA_SQL = 'CREATE SCHEMA IF NOT EXISTS "blog";\n'

const ENVIRONMENT = `
# Key that encrypts EmDash plugin secrets. Generate one with \`bunx emdash secrets generate\`.
# @optional @sensitive
EMDASH_ENCRYPTION_KEY=
`

// Uploaded media hold content. The dev server writes emdash-env.d.ts from the content model, so it
// stays tracked.
const IGNORED_PATHS = ["uploads"] as const

// The Node adapter serves EmDash's admin and API on demand, and `output: "static"` keeps every
// existing page prerendered. EmDash copies the database config into the server bundle, so the
// descriptor names a module that reads DATABASE_URL at runtime instead of holding the URL. It sets no
// `migrations`, because EmDash migrates at runtime and its migration command would ignore the schema.
// EmDash ignores Astro's `site`, and production setup fails without a public origin, so both read
// the same value.
const EDITS: readonly Edit[] = [
  {
    imports: [
      { from: "node:url", imported: "fileURLToPath" },
      { from: "@astrojs/node", imported: "default", local: "node" },
      { from: "emdash/astro", imported: "default", local: "emdash" },
      { from: "emdash/astro", imported: "local" },
    ],
    manual:
      'Add `adapter: node({ mode: "standalone" })` and the `emdash()` integration with a postgres database descriptor for src/shared/emdash-database.ts, `local()` storage, and `siteUrl` set to the same value as `site` to astro.config.ts.',
    marker: "emdash({",
    path: "astro.config.ts",
    replacements: [
      [
        "export default defineConfig({\n",
        "const site = ENV.PUBLIC_SITE_URL ?? SITE_URL\n\nexport default defineConfig({\n",
      ],
      ['  output: "static",\n', '  adapter: node({ mode: "standalone" }),\n  output: "static",\n'],
      ["  site: ENV.PUBLIC_SITE_URL ?? SITE_URL,\n", "  site,\n"],
      [
        "    mdx(),\n",
        '    mdx(),\n    emdash({\n      database: {\n        config: {},\n        entrypoint: fileURLToPath(new URL("src/shared/emdash-database.ts", import.meta.url)),\n        type: "postgres",\n      },\n      siteUrl: site,\n      storage: local({ baseUrl: "/_emdash/api/media/file", directory: "./uploads" }),\n    }),\n',
      ],
    ],
  },
  {
    manual:
      "Add `# @import(../../packages/database/env/.env.server)` to the header of .env.schema.",
    marker: "packages/database/env/.env.server",
    path: ".env.schema",
    replacements: [
      [
        "# @generateTsTypes(path=./src/shared/env.generated.ts, exposeEnv=local)\n",
        "# @generateTsTypes(path=./src/shared/env.generated.ts, exposeEnv=local)\n# @import(../../packages/database/env/.env.server)\n",
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
  return `${path}: ignored the EmDash uploads`
}

// apps/web reads the same local database as the other application workspaces.
async function addLocalDatabaseUrl() {
  const path = `${WEB_PATH}/.env.development`
  const file = Bun.file(path)
  const source = (await file.exists()) ? await file.text() : ""

  if (/^DATABASE_URL=/m.test(source)) {
    return `[SKIPPED] ${path} already sets DATABASE_URL`
  }

  const databaseEnvironment = await Bun.file(`${DATABASE_PATH}/.env.development`).text()
  const line = /^DATABASE_URL=.*$/m.exec(databaseEnvironment)?.[0]

  if (!line) {
    return `[MANUAL] ${DATABASE_PATH}/.env.development has no DATABASE_URL. Set DATABASE_URL in ${path}.`
  }

  await Bun.write(path, `${source.trimEnd()}\n${line}\n`.trimStart())
  return `${path}: set DATABASE_URL to the local database`
}

async function listMigrations() {
  return Array.fromAsync(new Bun.Glob("*.sql").scan({ cwd: MIGRATIONS_PATH }))
}

// Drizzle creates the schema, so the deploy that migrates the app's tables creates it too. The
// schema stays out of src/schema/, because drizzle-kit push would then drop EmDash's tables.
async function addSchemaMigration() {
  const before = await listMigrations()
  const sources = await Promise.all(
    before.map((name) => Bun.file(`${MIGRATIONS_PATH}/${name}`).text())
  )

  if (sources.some((source) => source.includes(SCHEMA_SQL.trim()))) {
    return `[SKIPPED] ${MIGRATIONS_PATH} already creates the blog schema`
  }

  // drizzle.config.ts loads DATABASE_URL through Varlock, which reads .env.development only for the
  // development environment. Generating the file never connects to the database.
  await Bun.$`cd ${DATABASE_PATH} && bun run generate --custom --name=blog-schema`
    .env({ ...process.env, VARLOCK_ENV: process.env.VARLOCK_ENV ?? "development" })
    .quiet()
  const after = await listMigrations()
  const created = after.find((name) => !before.includes(name))

  if (!created) {
    throw new Error(`drizzle-kit did not create a migration in ${MIGRATIONS_PATH}.`)
  }

  await Bun.write(`${MIGRATIONS_PATH}/${created}`, SCHEMA_SQL)
  return `${MIGRATIONS_PATH}/${created}: created the blog schema`
}

export function registerEmDashGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator("emdash", {
    actions: () => [
      async () => {
        if (!(await Bun.file(`${WEB_PATH}/package.json`).exists())) {
          throw new Error(`EmDash needs ${WEB_PATH}. Add it with bun template add.`)
        }

        if (!(await Bun.file(`${DATABASE_PATH}/package.json`).exists())) {
          throw new Error(
            `EmDash stores content in ${DATABASE_PATH}. Add it with bun template add.`
          )
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
      {
        path: `${WEB_PATH}/src/shared/emdash-database.ts`,
        skipIfExists: true,
        templateFile: "templates/emdash/web-emdash-database.ts.hbs",
        type: "add",
      },
      addEnvironment,
      addLocalDatabaseUrl,
      ignoreContent,
      ...EDITS.map((edit) => () => applyEdit(`${WEB_PATH}/${edit.path}`, edit)),
      addSchemaMigration,
      async () =>
        `Run \`bun run --filter ${await readPackageName(`${DATABASE_PATH}/package.json`)} migrate\` to create the blog schema.`,
      () =>
        "Run `bun run --filter web dev`, open /_emdash/admin/, and finish the setup wizard. Commit the emdash-env.d.ts it writes.",
      () =>
        'Query content with `getEmDashCollection()` from "emdash" in a page that sets `export const prerender = false`.',
      () =>
        `Uploaded media live in ${WEB_PATH}/uploads, so the server needs a persistent disk. Run \`bun run --filter web build\`, then \`bun run --filter web start\`, and remove ${WEB_PATH}/vercel.json if you no longer deploy to Vercel.`,
      () => "Run `bun run codegen` and `bun run fix`, then `bun template doctor`.",
    ],
    description: "Add the EmDash CMS to apps/web",
    prompts: [],
  })
}
