import { existsSync } from "node:fs"
import { glob, readFile, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"

import {
  getScopePrefix,
  normalizeScope,
  readPackageJson,
  replaceTextInFiles,
  writeJson,
} from "./shared.ts"

type RenameOptions = {
  projectName?: string
  rootDir: string
  scope: string
  sourceScope: string
}

// Expo schemes and Android package segments must start with a lowercase letter, which npm scopes
// do not guarantee.
export function getExpoAppId(scope: string) {
  const appId = scope.toLowerCase()

  return /^[a-z]/.test(appId) ? appId : `app-${appId}`
}

// Expo derives the slug, scheme, and native identifiers from APP_ID and the display name from
// APP_NAME.
async function renameExpoApps(rootDir: string, scope: string) {
  // Setup renames from the repository root, and add renames from inside the copied workspace.
  const configs = [
    "app.config.js",
    ...(await Array.fromAsync(glob("apps/*/app.config.js", { cwd: rootDir }))),
  ]
  const changedFiles = await Promise.all(
    configs.map(async (relativePath) => {
      const path = join(rootDir, relativePath)
      if (!existsSync(path)) return null

      const contents = await readFile(path, "utf8")
      const renamed = contents
        .replace(/^const APP_ID = ".*"$/m, `const APP_ID = "${getExpoAppId(scope)}"`)
        .replace(/^const APP_NAME = ".*"$/m, `const APP_NAME = "${scope}"`)
      if (renamed === contents) return null

      await writeFile(path, renamed)
      return path
    })
  )

  return changedFiles.filter((path): path is string => path !== null)
}

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const

function sortByName(dependencies: Readonly<Record<string, string>> | undefined) {
  return dependencies === undefined
    ? undefined
    : Object.fromEntries(
        Object.entries(dependencies).toSorted(([left], [right]) => (left < right ? -1 : 1))
      )
}

// Renaming the scope moves the workspace dependencies within each sorted dependency list, so the
// rename sorts the lists of every manifest it changed.
async function sortDependencies(paths: readonly string[]) {
  await Promise.all(
    paths
      .filter((path) => basename(path) === "package.json")
      .map(async (path) => {
        const packageJson = await readPackageJson(path)
        const sorted = Object.fromEntries(
          DEPENDENCY_FIELDS.flatMap((field) => {
            const dependencies = sortByName(packageJson[field])
            return dependencies === undefined ? [] : [[field, dependencies]]
          })
        )
        await writeJson(path, { ...packageJson, ...sorted })
      })
  )
}

export async function renameProject({ rootDir, projectName, scope, sourceScope }: RenameOptions) {
  const renamedFiles = await replaceTextInFiles(
    rootDir,
    getScopePrefix(normalizeScope(sourceScope)),
    getScopePrefix(normalizeScope(scope))
  )
  await sortDependencies(renamedFiles)

  const changedFiles = new Set([
    ...renamedFiles,
    ...(await renameExpoApps(rootDir, normalizeScope(scope))),
  ])

  if (!projectName) return { changedFiles: [...changedFiles] }

  const packageJsonPath = join(rootDir, "package.json")
  const packageJson = await readPackageJson(packageJsonPath)
  if (packageJson.name !== projectName) {
    packageJson.name = projectName
    await writeJson(packageJsonPath, packageJson)
    changedFiles.add(packageJsonPath)
  }

  return { changedFiles: [...changedFiles] }
}
