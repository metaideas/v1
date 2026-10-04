import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import { readPackageJson } from "../schemas"

type Edit = {
  path: string
  marker: string
  imports: readonly string[]
  replacements: ReadonlyArray<readonly [anchor: string, replacement: string]>
  manual: string
}

const API_PATH = "apps/api"
const JOBS_PATH = "packages/jobs"

const ENVIRONMENT = `
# Basic-auth username for the jobs dashboard at /jobs. The dashboard stays off without it.
# @optional
JOBS_DASHBOARD_USERNAME=

# Basic-auth password for the jobs dashboard.
# @optional @type=string(minLength=16)
JOBS_DASHBOARD_PASSWORD=
`

const DASHBOARD_IMPORT = 'import { jobsDashboard } from "#shared/jobs-dashboard.ts"'

const EDITS: readonly Edit[] = [
  {
    imports: [DASHBOARD_IMPORT],
    manual:
      "Mount the dashboard in src/routes/index.ts with `if (jobsDashboard) app.route(jobsDashboard.path, jobsDashboard.routes)`, outside the typed router.",
    marker: "jobsDashboard.routes",
    path: "src/routes/index.ts",
    replacements: [
      [
        'app.on(["POST", "GET"], "/auth/**", (c) => c.var.auth.handler(c.req.raw))\n',
        'app.on(["POST", "GET"], "/auth/**", (c) => c.var.auth.handler(c.req.raw))\n\nif (jobsDashboard) {\n  app.route(jobsDashboard.path, jobsDashboard.routes)\n}\n',
      ],
    ],
  },
  {
    imports: [DASHBOARD_IMPORT],
    manual: "Call `await jobsDashboard?.close()` in the shutdown handler of src/index.ts.",
    marker: "jobsDashboard?.close()",
    path: "src/index.ts",
    replacements: [["  process.exit(0)", "  await jobsDashboard?.close()\n  process.exit(0)"]],
  },
]

function addImport(source: string, line: string) {
  if (source.includes(line)) {
    return source
  }

  const lines = source.split("\n")
  const lastImport = lines.findLastIndex((text) => /^(import .+|\}) from "[^"]+"$/.test(text))
  lines.splice(lastImport + 1, 0, line)

  return lines.join("\n")
}

async function applyEdit(path: string, edit: Edit) {
  const file = Bun.file(path)

  if (!(await file.exists())) {
    return `[MANUAL] ${path} is missing. ${edit.manual}`
  }

  let source = await file.text()

  if (source.includes(edit.marker)) {
    return `[SKIPPED] ${path} already uses bull-board`
  }

  if (edit.replacements.some(([anchor]) => !source.includes(anchor))) {
    return `[MANUAL] ${path} changed since generation. ${edit.manual}`
  }

  for (const [anchor, replacement] of edit.replacements) {
    source = source.replace(anchor, replacement)
  }

  for (const line of edit.imports) {
    source = addImport(source, line)
  }

  await Bun.write(path, source)
  return `${path}: connected bull-board`
}

async function addEnvironment() {
  const schemaPath = `${API_PATH}/.env.schema`
  const schema = await Bun.file(schemaPath).text()
  const missing = ENVIRONMENT.trim()
    .split("\n\n")
    .filter((declaration) => {
      const key = /^([A-Z0-9_]+)=/m.exec(declaration)?.[1]
      return key !== undefined && !new RegExp(`^${key}=`, "m").test(schema)
    })

  if (missing.length === 0) {
    return `[SKIPPED] ${schemaPath} already declares the jobs dashboard variables`
  }

  await Bun.write(schemaPath, `${schema.trimEnd()}\n\n${missing.join("\n\n")}\n`)
  return `${schemaPath}: added the optional jobs dashboard variables`
}

export function registerBullBoardGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator("bull-board", {
    actions: () => [
      async () => {
        if (!(await Bun.file(`${JOBS_PATH}/package.json`).exists())) {
          throw new Error(`The jobs dashboard needs ${JOBS_PATH}. Add it with bun template add.`)
        }

        const api = await readPackageJson(`${API_PATH}/package.json`)

        if ("@bull-board/hono" in { ...api.dependencies, ...api.devDependencies }) {
          return `[SKIPPED] ${API_PATH} already contains bull-board`
        }

        // The dashboard opens its own queues, so it must use the BullMQ version the jobs package uses.
        const jobs = await readPackageJson(`${JOBS_PATH}/package.json`)
        const bullmq = jobs.dependencies?.bullmq

        if (!bullmq) {
          throw new Error(`${JOBS_PATH} does not declare a version of bullmq.`)
        }

        await Bun.$`cd ${API_PATH} && bun add --exact @bull-board/api @bull-board/hono bullmq@${bullmq}`
        return `${API_PATH}: installed bull-board`
      },
      {
        path: `${API_PATH}/src/shared/jobs-dashboard.ts`,
        skipIfExists: true,
        templateFile: "templates/bull-board/api-jobs-dashboard.ts.hbs",
        type: "add",
      },
      addEnvironment,
      ...EDITS.map((edit) => () => applyEdit(`${API_PATH}/${edit.path}`, edit)),
      () =>
        "Set JOBS_DASHBOARD_USERNAME and JOBS_DASHBOARD_PASSWORD in apps/api, then open /jobs on the API.",
      () => "Run `bun run codegen` and `bun run fix`, then `bun template doctor`.",
    ],
    description: "Add a bull-board dashboard for the job queues to apps/api",
    prompts: [],
  })
}
