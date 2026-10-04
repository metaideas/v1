const FEATURE_PATH = /\/apps\/[^/]+\/src\/features\/[^/]+\/(?<entry>.+)$/u
const ROLES = ["constants", "data", "errors", "handlers", "hooks", "schemas"] as const
const OPEN_FOLDERS = new Set(["assets", "components"])
const TEST_FOLDER = "__tests__"

function isRole(name: string) {
  return ROLES.some((role) => role === name)
}

function isRoleFile(file: string) {
  const [name] = file.split(".")
  return name !== undefined && isRole(name)
}

export const FEATURE_ROLE_FILES = ROLES.map((role) => `${role}.ts`).join(", ")

export function isAllowedFeatureFile(filename: string) {
  const entry = FEATURE_PATH.exec(filename.replaceAll("\\", "/"))?.groups?.entry

  if (entry === undefined) {
    return true
  }

  const segments = entry.split("/").filter((segment) => segment !== TEST_FOLDER)
  const [first, ...rest] = segments

  if (first === undefined) {
    return false
  }

  if (OPEN_FOLDERS.has(first)) {
    return rest.length > 0
  }

  if (rest.length === 0) {
    return isRoleFile(first)
  }

  return isRole(first) && rest.length === 1
}
