import type { PlopTypes } from "@turbo/gen"
import type { ImportItemInput } from "magicast"
import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"

import { addImports } from "../imports"
import { runCommand } from "../run-command"
import { readPackageJson } from "../schemas"

type Edit = {
  path: string
  marker: string
  imports: readonly ImportItemInput[]
  replacements: ReadonlyArray<readonly [anchor: string, replacement: string]>
  manual: string
}

const APP_PATH = "apps/app"

const EDITS: readonly Edit[] = [
  {
    imports: [{ from: "node:crypto", imported: "randomUUID" }],
    manual:
      "Add `define: { __DEPLOYMENT_ID__: JSON.stringify(randomUUID()) }` to the config in vite.config.ts.",
    marker: "__DEPLOYMENT_ID__",
    path: "vite.config.ts",
    replacements: [
      [
        "export default defineConfig(({ command }) => ({\n",
        "export default defineConfig(({ command }) => ({\n  define: {\n    // One ID per build, which the client and server bundles share. #shared/deployment.ts reads it.\n    __DEPLOYMENT_ID__: JSON.stringify(randomUUID()),\n  },\n",
      ],
    ],
  },
  {
    imports: [
      { from: "#shared/components/update-notice.tsx", imported: "default", local: "UpdateNotice" },
    ],
    manual:
      "Render the default export of #shared/components/update-notice.tsx once in src/shared/components/providers.tsx.",
    marker: "<UpdateNotice />",
    path: "src/shared/components/providers.tsx",
    replacements: [["        <Toaster />\n", "        <Toaster />\n        <UpdateNotice />\n"]],
  },
]

async function applyEdit(path: string, edit: Edit) {
  if (!existsSync(path)) {
    return `[MANUAL] ${path} is missing. ${edit.manual}`
  }

  let source = await readFile(path, "utf8")

  if (source.includes(edit.marker)) {
    return `[SKIPPED] ${path} is already connected to the update notice`
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

  await writeFile(path, source)

  return `${path}: connected the update notice`
}

export function registerSkewGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator("skew", {
    actions: () => [
      async () => {
        if (!existsSync(`${APP_PATH}/package.json`)) {
          throw new Error(`The update notice needs ${APP_PATH}. Add it with pnpm template add.`)
        }

        const app = await readPackageJson(`${APP_PATH}/package.json`)

        if ("@sanely/skew" in { ...app.dependencies, ...app.devDependencies }) {
          return `[SKIPPED] ${APP_PATH} already contains @sanely/skew`
        }

        await runCommand(["pnpm", "add", "@sanely/skew"], APP_PATH)

        return `${APP_PATH}: installed @sanely/skew`
      },
      {
        path: `${APP_PATH}/src/shared/deployment.ts`,
        skipIfExists: true,
        templateFile: "templates/skew/app-deployment.ts.hbs",
        type: "add",
      },
      {
        path: `${APP_PATH}/src/routes/api/deployment.ts`,
        skipIfExists: true,
        templateFile: "templates/skew/app-deployment-route.ts.hbs",
        type: "add",
      },
      {
        path: `${APP_PATH}/src/shared/components/update-notice.tsx`,
        skipIfExists: true,
        templateFile: "templates/skew/app-update-notice.tsx.hbs",
        type: "add",
      },
      ...EDITS.map((edit) => () => applyEdit(`${APP_PATH}/${edit.path}`, edit)),
      // TanStack Router adds the new route to the committed route tree when the app builds.
      async () => {
        await runCommand(["pnpm", "run", "build"], APP_PATH)

        return `${APP_PATH}: built the app, which adds /api/deployment to src/routeTree.gen.ts`
      },
      () =>
        "The notice appears only after a new deployment. To see it, build and start the app, open a page, then build and start the app again.",
      () => "Run `pnpm run fix`, then `pnpm template doctor`.",
    ],
    description: "Add a notice to apps/app that asks users to reload after a new deployment",
    prompts: [],
  })
}
