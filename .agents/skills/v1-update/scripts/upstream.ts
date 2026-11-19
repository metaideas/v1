import { defineCommand, runMain } from "citty"
import consola from "consola"

import {
  execFileAsync,
  fetchTemplate,
  getProjectScope,
  getScopePrefix,
  readTemplateStamp,
  TEMPLATE_REPO,
  TEMPLATE_SCOPE,
  writeTemplateStamp,
} from "./template.ts"

async function readStampedCommit(rootDir: string) {
  const stamp = await readTemplateStamp(rootDir)
  if (!stamp?.commit) {
    throw new Error(
      "No template commit is recorded in .template.json. Record one with the stamp command."
    )
  }

  return { ...stamp, commit: stamp.commit }
}

const diff = defineCommand({
  args: {
    "name-only": {
      description: "List changed files instead of printing the patch",
      type: "boolean",
    },
  },
  meta: {
    description: "Show upstream template changes since the recorded commit, scoped to this project",
    name: "diff",
  },
  run: async ({ args }) => {
    const rootDir = process.cwd()
    const { commit } = await readStampedCommit(rootDir)
    const head = await fetchTemplate(rootDir)
    if (head === commit) {
      consola.success(`The project matches ${TEMPLATE_REPO}@${head.slice(0, 12)}.`)
      return
    }

    const format = args["name-only"] ? ["--name-only"] : []
    const { stdout } = await execFileAsync("git", ["diff", ...format, commit, head], {
      cwd: rootDir,
      maxBuffer: Number.POSITIVE_INFINITY,
    })
    const scope = await getProjectScope(rootDir)

    process.stdout.write(stdout.replaceAll(getScopePrefix(TEMPLATE_SCOPE), getScopePrefix(scope)))
  },
})

const stamp = defineCommand({
  meta: {
    description: "Record the latest template commit in .template.json as the new baseline",
    name: "stamp",
  },
  run: async () => {
    const rootDir = process.cwd()
    const current = await readStampedCommit(rootDir)
    const head = await fetchTemplate(rootDir)

    await writeTemplateStamp(rootDir, { ...current, commit: head })
    consola.success(`Recorded ${TEMPLATE_REPO}@${head.slice(0, 12)} in .template.json.`)
  },
})

await runMain(
  defineCommand({
    meta: {
      description: "Compare this project with the upstream v1 template",
      name: "upstream",
    },
    subCommands: { diff, stamp },
  })
)
