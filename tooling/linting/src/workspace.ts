import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

/**
 * The role names a feature folder can hold. `assets` and `components` are folders with any files
 * inside. Every other role is a file, such as `handlers.ts`, that becomes a folder of the same name
 * when it grows. See docs/project-structure.md.
 */
export const FEATURE_ROLES = [
  "assets",
  "components",
  "constants",
  "data",
  "errors",
  "handlers",
  "hooks",
  "middleware",
  "schemas",
] as const

export type FeatureRole = (typeof FEATURE_ROLES)[number]

/**
 * Feature roles that are folders of any files rather than a role file.
 */
export const FOLDER_ROLES: ReadonlySet<string> = new Set(["assets", "components"])

/**
 * The server shape that a feature's `handlers.ts` implements, which picks the template that the
 * new-feature generator writes.
 */
export const HANDLER_KINDS = ["api", "app", "desktop", "worker"] as const

export type HandlerKind = (typeof HANDLER_KINDS)[number]

export type Boundaries = {
  /**
   * Maps a feature role, such as `handlers`, to the entrypoint tier that runs it.
   */
  featureTiers?: Readonly<Record<string, string>>
  /**
   * Source folders that compose the other layers, such as the API's `routes/`.
   */
  folders?: readonly string[]
  /**
   * The router folder, such as `routes` or `renderer/routes`.
   */
  routes?: string
  /**
   * Entrypoint tiers that never import each other, such as `shell` and `renderer`.
   */
  tiers?: readonly string[]
}

/**
 * What a workspace declares about itself in the `workspace` field of its `package.json`. Root
 * configuration reads these facts, so removing a workspace's folder removes them too.
 */
export type Workspace = {
  features: {
    handlers?: HandlerKind
    roles: readonly FeatureRole[]
  }
  /**
   * Knip settings for this workspace, as in the `workspaces` map of a Knip config.
   */
  knip?: Readonly<Record<string, unknown>>
  layers: Boundaries
}

const DEFAULT_WORKSPACE: Workspace = { features: { roles: FEATURE_ROLES }, layers: {} }

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isFeatureRole(value: string): value is FeatureRole {
  return FEATURE_ROLES.some((role) => role === value)
}

function isHandlerKind(value: unknown): value is HandlerKind {
  return HANDLER_KINDS.some((kind) => kind === value)
}

function parseFeatureTiers(value: unknown, source: string) {
  const message = `${source}: workspace.layers.featureTiers must map feature roles to tiers`

  if (!isRecord(value)) throw new Error(message)

  return Object.fromEntries(
    Object.entries(value).map(([role, tier]) => {
      if (!isFeatureRole(role) || typeof tier !== "string") throw new Error(message)
      return [role, tier]
    })
  )
}

function parseBoundaries(value: unknown, source: string): Boundaries {
  if (value === undefined) return {}
  if (!isRecord(value)) throw new Error(`${source}: workspace.layers must be an object`)

  const { featureTiers, folders, routes, tiers } = value

  if (folders !== undefined && !isStringArray(folders)) {
    throw new Error(`${source}: workspace.layers.folders must be a list of folder names`)
  }
  if (routes !== undefined && typeof routes !== "string") {
    throw new Error(`${source}: workspace.layers.routes must be a folder path`)
  }
  if (tiers !== undefined && !isStringArray(tiers)) {
    throw new Error(`${source}: workspace.layers.tiers must be a list of folder names`)
  }

  return {
    ...(featureTiers === undefined
      ? {}
      : { featureTiers: parseFeatureTiers(featureTiers, source) }),
    ...(folders === undefined ? {} : { folders }),
    ...(routes === undefined ? {} : { routes }),
    ...(tiers === undefined ? {} : { tiers }),
  }
}

function parseFeatures(value: unknown, source: string): Workspace["features"] {
  if (value === undefined) return DEFAULT_WORKSPACE.features
  if (!isRecord(value)) throw new Error(`${source}: workspace.features must be an object`)

  const { handlers, roles } = value

  if (!isStringArray(roles)) {
    throw new Error(`${source}: workspace.features.roles must list feature roles`)
  }
  const unknown = roles.filter((role) => !isFeatureRole(role))
  if (unknown.length > 0) {
    throw new Error(
      `${source}: workspace.features.roles lists ${unknown.join(", ")}, which are not feature roles. Use ${FEATURE_ROLES.join(", ")}.`
    )
  }
  if (handlers !== undefined && !isHandlerKind(handlers)) {
    throw new Error(
      `${source}: workspace.features.handlers must be one of ${HANDLER_KINDS.join(", ")}`
    )
  }

  return {
    ...(handlers === undefined ? {} : { handlers }),
    roles: roles.filter((role) => isFeatureRole(role)),
  }
}

/**
 * Parses the `workspace` field of a parsed `package.json`. A workspace without the field allows
 * every feature role and declares no route, tier, or composition folders.
 */
export function parseWorkspace(packageJson: unknown, source: string): Workspace {
  const value = isRecord(packageJson) ? packageJson.workspace : undefined

  if (value === undefined) return DEFAULT_WORKSPACE
  if (!isRecord(value)) throw new Error(`${source}: workspace must be an object`)

  const { knip } = value
  if (knip !== undefined && !isRecord(knip)) {
    throw new Error(`${source}: workspace.knip must be an object`)
  }

  return {
    features: parseFeatures(value.features, source),
    ...(knip === undefined ? {} : { knip }),
    layers: parseBoundaries(value.layers, source),
  }
}

const cache = new Map<string, Workspace>()

/**
 * Reads the `workspace` field of the `package.json` in a workspace folder.
 */
export function readWorkspace(directory: string) {
  const file = path.join(directory, "package.json")
  const cached = cache.get(file)

  if (cached !== undefined) return cached

  const workspace = existsSync(file)
    ? parseWorkspace(JSON.parse(readFileSync(file, "utf8")), file)
    : DEFAULT_WORKSPACE
  cache.set(file, workspace)

  return workspace
}
