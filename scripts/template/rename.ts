import { join } from "node:path"

import {
  getScopePrefix,
  normalizeScope,
  readPackageJson,
  replaceTextInFiles,
  writeJson,
} from "./shared"

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
    ...(await Array.fromAsync(new Bun.Glob("apps/*/app.config.js").scan({ cwd: rootDir }))),
  ]
  const changedFiles = await Promise.all(
    configs.map(async (relativePath) => {
      const path = join(rootDir, relativePath)
      if (!(await Bun.file(path).exists())) return null

      const contents = await Bun.file(path).text()
      const renamed = contents
        .replace(/^const APP_ID = ".*"$/m, `const APP_ID = "${getExpoAppId(scope)}"`)
        .replace(/^const APP_NAME = ".*"$/m, `const APP_NAME = "${scope}"`)
      if (renamed === contents) return null

      await Bun.write(path, renamed)
      return path
    })
  )

  return changedFiles.filter((path): path is string => path !== null)
}

export async function renameProject({ rootDir, projectName, scope, sourceScope }: RenameOptions) {
  const changedFiles = new Set([
    ...(await replaceTextInFiles(
      rootDir,
      getScopePrefix(normalizeScope(sourceScope)),
      getScopePrefix(normalizeScope(scope))
    )),
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
