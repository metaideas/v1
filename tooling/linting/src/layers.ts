import path from "node:path"

export type Boundaries = {
  /**
   * Maps a feature role, such as `handlers`, to the entrypoint tier that runs it.
   */
  featureTiers?: Readonly<Record<string, string>>
  folders?: readonly string[]
  routes?: string
  tiers?: readonly string[]
}

export type Layer =
  | { kind: "composition" }
  | { kind: "feature"; name: string }
  | { kind: "route" }
  | { kind: "shared" }

export type Location = {
  layer: Layer
  tier?: string
}

export type SourceRoot = {
  app: string
  path: string
}

export type Violation =
  | "featureImportsComposition"
  | "featureImportsFeature"
  | "routeImportsRoute"
  | "sharedImportsUp"
  | "tierImportsTier"
  | "untieredImportsTier"

const LAYER_FOLDERS = ["shared", "features"] as const
const TEST_FOLDER = "__tests__"
const SOURCE_ROOT = /^(?<root>.*\/apps\/(?<app>[^/]+)\/src)\//u
const MODULE_EXTENSIONS = new Set([
  "",
  ".astro",
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
])

function isBoundaryMap(value: unknown): value is Readonly<Record<string, Boundaries>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function findSourceRoot(filename: string) {
  const groups = SOURCE_ROOT.exec(filename.replaceAll("\\", "/"))?.groups

  if (groups?.root === undefined || groups.app === undefined) {
    return
  }

  return { app: groups.app, path: groups.root }
}

export function selectBoundaries(options: unknown, app: string): Boundaries {
  return isBoundaryMap(options) ? (options[app] ?? {}) : {}
}

export function resolveImport(root: SourceRoot, importer: string, specifier: string) {
  if (specifier.startsWith("#")) {
    return path.posix.join(root.path, specifier.slice(1))
  }

  return specifier.startsWith(".")
    ? path.posix.resolve(path.posix.dirname(importer.replaceAll("\\", "/")), specifier)
    : undefined
}

function isModule(file: string) {
  return MODULE_EXTENSIONS.has(path.posix.extname(file))
}

export function locate(
  root: SourceRoot,
  boundaries: Boundaries,
  file: string
): Location | undefined {
  const relative = path.posix.relative(root.path, file)

  if (relative.startsWith("..")) {
    return undefined
  }

  const [top, name] = relative.split("/")
  const tier = top !== undefined && boundaries.tiers?.includes(top) ? top : undefined

  if (top === "shared") {
    // A shared folder named after a tier, such as `shared/shell/`, holds code only that tier runs.
    const sharedTier = name !== undefined && boundaries.tiers?.includes(name) ? name : undefined

    return { layer: { kind: "shared" }, tier: sharedTier }
  }

  if (top === "features" && name !== undefined) {
    return { layer: { kind: "feature", name }, tier: findFeatureTier(boundaries, relative) }
  }

  if (
    boundaries.routes !== undefined
    && (relative === boundaries.routes || relative.startsWith(`${boundaries.routes}/`))
  ) {
    return { layer: { kind: "route" }, tier }
  }

  return { layer: { kind: "composition" }, tier }
}

// A role is the first segment after the feature name, without its extension, so
// `handlers.ts` and `handlers/sign-in.ts` share the `handlers` role.
function findFeatureTier(boundaries: Boundaries, relative: string) {
  const role = relative
    .split("/")
    .slice(2)
    .find((segment) => segment !== TEST_FOLDER)

  return role === undefined ? undefined : boundaries.featureTiers?.[role.split(".")[0] ?? role]
}

export function listLayerFolders(boundaries: Boundaries) {
  const routes = boundaries.routes?.split("/")[0]

  return [
    ...new Set([
      ...LAYER_FOLDERS,
      ...(routes === undefined ? [] : [routes]),
      ...(boundaries.tiers ?? []),
      ...(boundaries.folders ?? []),
    ]),
  ]
}

export function findStrayFolder(root: SourceRoot, boundaries: Boundaries, file: string) {
  const [top, ...rest] = path.posix.relative(root.path, file.replaceAll("\\", "/")).split("/")

  if (top === undefined || top === ".." || rest.length === 0) {
    return
  }

  return listLayerFolders(boundaries).includes(top) ? undefined : top
}

export function findViolation(from: Location, to: Location, target: string): Violation | undefined {
  if (from.tier !== undefined && to.tier !== undefined && from.tier !== to.tier) {
    return "tierImportsTier"
  }

  // Both tiers load untiered shared code and a feature's untiered roles, such as `schemas.ts`, so
  // neither can pull in a tier's code.
  if (
    (from.layer.kind === "feature" || from.layer.kind === "shared")
    && from.tier === undefined
    && to.tier !== undefined
  ) {
    return "untieredImportsTier"
  }

  switch (from.layer.kind) {
    case "shared":
      return to.layer.kind === "shared" ? undefined : "sharedImportsUp"
    case "feature":
      if (to.layer.kind === "shared") return undefined
      if (to.layer.kind === "feature") {
        return to.layer.name === from.layer.name ? undefined : "featureImportsFeature"
      }
      return "featureImportsComposition"
    case "route":
      return to.layer.kind === "route" && isModule(target) ? "routeImportsRoute" : undefined
    case "composition":
      return undefined
  }
}
