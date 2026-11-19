import { existsSync } from "node:fs"
import path from "node:path"

const CORE_SERVICE = /^(?<root>.*)\/packages\/core\/src\/services\/(?<service>[^/]+)\//u

/**
 * Finds the service folder of a file in `packages/core/src/services/` when a package workspace has
 * the same name. A contract that only one package uses belongs to that package, so removing the
 * package removes it.
 */
export function findPackageOwnedService(filename: string) {
  const groups = CORE_SERVICE.exec(filename.replaceAll("\\", "/"))?.groups

  if (groups?.root === undefined || groups.service === undefined) return

  return existsSync(path.join(groups.root, "packages", groups.service, "package.json"))
    ? groups.service
    : undefined
}
