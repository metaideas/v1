import path from "node:path"
import { type FeatureRole, FOLDER_ROLES, readWorkspace } from "#workspace.ts"

const FEATURE_PATH = /^(?<app>.*\/apps\/[^/]+)\/src\/features\/[^/]+\/(?<entry>.+)$/u
const TEST_FOLDER = "__tests__"

function findRole(roles: readonly FeatureRole[], name: string) {
  return roles.find((role) => role === name)
}

/**
 * Lists the files and folders that a feature in this workspace can hold, for error messages.
 */
export function listFeatureEntries(roles: readonly FeatureRole[]) {
  return roles.map((role) => (FOLDER_ROLES.has(role) ? `${role}/` : `${role}.ts`)).join(", ")
}

/**
 * Finds the feature roles that the application workspace owning a feature file allows, or
 * `undefined` when the file is not inside a feature folder.
 */
export function findFeatureRoles(filename: string) {
  const app = FEATURE_PATH.exec(filename.replaceAll("\\", "/"))?.groups?.app

  return app === undefined ? undefined : readWorkspace(path.posix.normalize(app)).features.roles
}

export function isAllowedFeatureFile(filename: string, roles: readonly FeatureRole[]) {
  const entry = FEATURE_PATH.exec(filename.replaceAll("\\", "/"))?.groups?.entry

  if (entry === undefined) {
    return true
  }

  const segments = entry.split("/").filter((segment) => segment !== TEST_FOLDER)
  const [first, ...rest] = segments

  if (first === undefined) {
    return false
  }

  const folderRole = findRole(roles, first)

  if (folderRole !== undefined && FOLDER_ROLES.has(folderRole)) {
    return rest.length > 0
  }

  if (rest.length === 0) {
    const fileRole = findRole(roles, first.split(".")[0] ?? first)
    return fileRole !== undefined && !FOLDER_ROLES.has(fileRole)
  }

  return folderRole !== undefined && rest.length === 1
}
