const PACKAGE_SOURCE = /\/packages\/[^/]+\/src\//u
const GENERATED_ENV = /(?:^|[/#])env\.generated(?:\.ts)?$/u

type Kind = "type" | "value" | undefined

/**
 * Whether a file is runtime source of a package workspace, which takes configuration as factory
 * arguments instead of reading `ENV`.
 */
export function isPackageSource(filename: string) {
  return PACKAGE_SOURCE.test(filename.replaceAll("\\", "/"))
}

/**
 * Whether an import or export statement brings a runtime value from a generated `env.generated.ts`
 * binding. Type-only imports are erased, so they read no configuration.
 */
export function importsEnvValue(source: string, kind: Kind, specifierKinds: readonly Kind[]) {
  if (!GENERATED_ENV.test(source) || kind === "type") return false
  if (specifierKinds.length === 0) return true

  return specifierKinds.some((specifierKind) => specifierKind !== "type")
}
