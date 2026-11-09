import { defineCommand } from "citty"
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
} from "./shared"

export default defineCommand({
  args: {
    "name-only": {
      description: "List changed files instead of printing the patch",
      type: "boolean",
    },
    "update-stamp": {
      description: "Record the fetched template commit in .template.json",
      type: "boolean",
    },
  },
  meta: {
    description: "Show upstream template changes since the recorded commit, scoped to this project",
    name: "diff",
  },
  run: async ({ args }) => {
    const rootDir = process.cwd()
    const stamp = await readTemplateStamp(rootDir)
    if (!stamp?.commit) {
      consola.error(
        "No template commit is recorded in .template.json. Run bun template setup first."
      )
      process.exitCode = 1
      return
    }

    const head = await fetchTemplate(rootDir)
    if (head === stamp.commit) {
      consola.success(`The project matches ${TEMPLATE_REPO}@${head.slice(0, 12)}.`)
      return
    }

    const format = args["name-only"] ? ["--name-only"] : []
    const { stdout: diff } = await execFileAsync("git", ["diff", ...format, stamp.commit, head], {
      cwd: rootDir,
      maxBuffer: Number.POSITIVE_INFINITY,
    })
    const scope = await getProjectScope(rootDir)

    process.stdout.write(diff.replaceAll(getScopePrefix(TEMPLATE_SCOPE), getScopePrefix(scope)))

    if (args["update-stamp"]) {
      await writeTemplateStamp(rootDir, { ...stamp, commit: head })
      consola.success(`Recorded ${TEMPLATE_REPO}@${head.slice(0, 12)} in .template.json.`)
    }
  },
})
