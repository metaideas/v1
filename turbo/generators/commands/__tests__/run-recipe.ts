import type { PlopTypes } from "@turbo/gen"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const ROOT = join(import.meta.dirname, "../../../..")

/**
 * Reads a file from the template, so a test runs a recipe against the code that the recipe edits.
 */
export function readTemplateFile(path: string) {
  return readFile(join(ROOT, path), "utf8")
}

function isCustomAction(action: PlopTypes.ActionType): action is PlopTypes.CustomActionFunction {
  return typeof action === "function"
}

/**
 * Runs a template recipe's function actions in a temporary project that holds `files`. Returns what
 * each action reported, and each of `files` after the run. Plop renders the template actions
 * itself, so the run skips them.
 */
export async function runRecipe(
  register: (plop: PlopTypes.NodePlopAPI) => void,
  answers: PlopTypes.Answers,
  files: Record<string, string>
) {
  const projectDir = await mkdtemp(join(tmpdir(), "recipe-"))
  const workingDir = process.cwd()

  try {
    await Promise.all(
      Object.entries(files).map(async ([path, content]) => {
        await mkdir(dirname(join(projectDir, path)), { recursive: true })
        await writeFile(join(projectDir, path), content)
      })
    )

    process.chdir(projectDir)

    let config: Partial<PlopTypes.PlopGeneratorConfig> | undefined

    // SAFETY: a recipe only registers its generator, and its actions ignore the Plop API that Plop
    // passes them, so the fake implements `setGenerator` alone.
    const plop = {
      setGenerator: (_name: string, generatorConfig: Partial<PlopTypes.PlopGeneratorConfig>) => {
        config = generatorConfig
      },
    } as PlopTypes.NodePlopAPI

    register(plop)

    const configured = config?.actions
    const actions = Array.isArray(configured) ? configured : (configured?.(answers) ?? [])

    const reports: string[] = []

    for (const action of actions) {
      if (isCustomAction(action)) {
        // oxlint-disable-next-line no-await-in-loop -- Plop runs actions in order, and an action can read what an earlier one wrote.
        reports.push(await action(answers, { type: "function" }, plop))
      }
    }

    const results = await Promise.all(
      Object.keys(files).map(async (path) => [path, await readFile(path, "utf8")] as const)
    )

    return { files: Object.fromEntries(results), reports }
  } finally {
    process.chdir(workingDir)
    await rm(projectDir, { force: true, recursive: true })
  }
}
