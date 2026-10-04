import { relative } from "node:path"
import { defineCommand } from "citty"
import consola from "consola"

import { findTextReferences, getWorkspaceGraph, getWorkspacePath, removePath } from "./shared"

function isProse(path: string) {
  return path.startsWith(".agents/") || path.endsWith(".md") || path.endsWith(".mdx")
}

function parseKind(value: string) {
  return value === "app" || value === "package" ? value : undefined
}

export default defineCommand({
  args: {
    kind: {
      description: "Workspace type to remove: app or package",
      required: true,
      type: "positional",
    },
    name: {
      description: "Name of the workspace directory to remove",
      required: true,
      type: "positional",
    },
  },
  meta: {
    description: "Delete a workspace and report what still references it",
    name: "remove",
  },
  run: async ({ args }) => {
    const kind = parseKind(args.kind)
    if (!kind) {
      consola.error(`Unknown workspace type: ${args.kind}. Use app or package.`)
      process.exitCode = 1
      return
    }

    const rootDir = process.cwd()
    const workspaces = await getWorkspaceGraph(rootDir)
    const target = workspaces.find((entry) => entry.kind === kind && entry.name === args.name)
    if (!target) {
      consola.error(`The ${getWorkspacePath({ kind, name: args.name })} workspace does not exist.`)
      process.exitCode = 1
      return
    }

    const targetPath = getWorkspacePath(target)
    await removePath(rootDir, targetPath)
    consola.success(`Removed ${targetPath}.`)

    const dependents = workspaces
      .filter((entry) => entry.dependencies.includes(target.packageName))
      .map((entry) => getWorkspacePath(entry))
    const terms =
      target.kind === "app"
        ? [`"${target.packageName}"`, `"${target.packageName}/`, targetPath]
        : [target.packageName, targetPath]
    const referencingFiles = await Promise.all(
      terms.map((term) => findTextReferences(rootDir, term))
    )
    const references = [...new Set(referencingFiles.flat())]
      .map((path) => relative(rootDir, path))
      .filter((path) => !isProse(path) && path !== "bun.lock")
      .toSorted()

    if (dependents.length > 0)
      consola.warn(`Workspaces that depended on it: ${dependents.join(", ")}`)
    if (references.length > 0) {
      consola.warn(`Files that still reference ${targetPath}:\n  ${references.join("\n  ")}`)
    }

    consola.info("Remove the references above, run bun install, then bun template doctor.")
  },
})
