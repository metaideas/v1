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

export async function renameProject({ rootDir, projectName, scope, sourceScope }: RenameOptions) {
  const changedFiles = new Set(
    await replaceTextInFiles(
      rootDir,
      getScopePrefix(normalizeScope(sourceScope)),
      getScopePrefix(normalizeScope(scope))
    )
  )

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
