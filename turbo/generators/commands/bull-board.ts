import type { PlopTypes } from "@turbo/gen"
import type { ImportItemInput } from "magicast"
import Bun from "bun"

import { addImports } from "../imports"
import { readPackageJson } from "../schemas"

type Edit = {
  path: string
  marker: string
  imports: readonly ImportItemInput[]
  replacements: ReadonlyArray<readonly [anchor: string, replacement: string]>
  manual: string
}

type BullBoardAnswers = PlopTypes.Answers & { theme?: string }

type Theme = { light: Record<string, string>; dark: Record<string, string> }

const API_PATH = "apps/api"
const JOBS_PATH = "packages/jobs"
const UI_STYLES_PATH = "packages/ui/src/styles/globals.css"

// The shadcn tokens bull-board reads the same way. The chart ramp is left out because bull-board
// plots job statuses with it, and sidebar-primary because shadcn uses it for brand marks while
// bull-board uses it for the active entry. destructive-foreground is read separately.
const THEME_TOKENS = new Set([
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "radius",
  "font-sans",
  "font-mono",
  "sidebar",
  "sidebar-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
])

// shadcn marks hovered and selected items with the accent colours, where bull-board mixes them from
// the primary colour.
const ACCENT_STATES = {
  "sidebar-state-hover": "var(--sidebar-accent)",
  "sidebar-state-selected": "var(--sidebar-accent)",
  "sidebar-state-selected-foreground": "var(--sidebar-accent-foreground)",
  "sidebar-state-selected-hover": "var(--sidebar-accent)",
  "state-hover": "var(--accent)",
  "state-selected": "var(--accent)",
  "state-selected-foreground": "var(--accent-foreground)",
  "state-selected-hover": "var(--accent)",
}

// packages/ui loads no font, so it renders with the Tailwind defaults instead of the IBM Plex
// fonts bull-board ships with.
const TAILWIND_FONTS = {
  "font-mono":
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  "font-sans":
    'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
}

const ENVIRONMENT = `
# Basic-auth username for the jobs dashboard at /jobs. The dashboard stays off without it.
# @optional
JOBS_DASHBOARD_USERNAME=

# Basic-auth password for the jobs dashboard.
# @optional @type=string(minLength=16)
JOBS_DASHBOARD_PASSWORD=
`

const DASHBOARD_IMPORT = { from: "#shared/jobs-dashboard.ts", imported: "jobsDashboard" }

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

function readTokens(css: string, selector: string) {
  const block = new RegExp(`^${selector}\\s*\\{([^}]*)\\}`, "m").exec(css)?.[1] ?? ""
  const tokens: Record<string, string> = {}

  let destructiveText: string | undefined

  for (const [, name, value] of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    if (name === "destructive-foreground") {
      destructiveText = value?.trim()
    } else if (name !== undefined && value !== undefined && THEME_TOKENS.has(name)) {
      tokens[name] = value.trim()
    }
  }

  // shadcn colours destructive text with destructive-foreground and can keep destructive dim
  // enough for a fill, while bull-board colours both error text and destructive fills with
  // destructive.
  if (destructiveText !== undefined) {
    tokens.destructive = destructiveText
  }

  return tokens
}

/**
 * Reads the bull-board theme from the shadcn tokens in the `:root` and `.dark` blocks of a
 * stylesheet.
 */
function readTheme(css: string): Theme {
  return {
    // bull-board redeclares the states for dark mode, so they are set for both themes.
    dark: { ...ACCENT_STATES, ...readTokens(css, "\\.dark") },
    light: { ...ACCENT_STATES, ...TAILWIND_FONTS, ...readTokens(css, ":root") },
  }
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

  const sourceWithImports = addImports(source, edit.imports)
  if (sourceWithImports === undefined) {
    return `[MANUAL] ${path} already binds a name this edit imports. ${edit.manual}`
  }

  source = sourceWithImports

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
    actions: (rawAnswers) => {
      const answers: BullBoardAnswers = rawAnswers ?? {}

      return [
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
        async () => {
          const styles = Bun.file(UI_STYLES_PATH)

          if (!(await styles.exists())) {
            return `[SKIPPED] ${UI_STYLES_PATH} is missing, so the dashboard keeps the bull-board theme`
          }

          answers.theme = JSON.stringify(readTheme(await styles.text()), null, 2)
          return `Matched the dashboard to the shadcn theme in ${UI_STYLES_PATH}`
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
      ]
    },
    description: "Add a bull-board dashboard for the job queues to apps/api",
    prompts: [],
  })
}
