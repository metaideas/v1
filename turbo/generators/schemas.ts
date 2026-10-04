import Bun from "bun"
import { parseJSON } from "confbox"
import * as z from "zod"

const PackageJsonSchema = z.looseObject({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  name: z.string().optional(),
})

export const NewFeatureAnswersSchema = z.object({
  app: z.string().min(1),
  files: z.array(z.string()),
  name: z.string().min(1),
})

export const NewPackageAnswersSchema = z.object({
  name: z.string().regex(/^[a-z]/i, "Start the package name with a letter"),
})

export const PostHogAnswersSchema = z.object({
  app: z.enum(["api", "app", "mobile"]),
})

export const SentryAnswersSchema = z.object({
  app: z.enum(["api", "app", "mobile"]),
})

export const BundledModulesSchema = z.record(z.string(), z.string())

export const TrustedDependenciesSchema = z.array(z.string()).optional()

// Narrowing the original value instead of returning the parsed copy keeps the key order of manifests that are written back.
function assertPackageJson(value: unknown): asserts value is z.infer<typeof PackageJsonSchema> {
  PackageJsonSchema.parse(value)
}

export async function readPackageJson(path: string) {
  const value = parseJSON(await Bun.file(path).text())
  assertPackageJson(value)

  return value
}

export async function readPackageName(path: string) {
  const { name } = await readPackageJson(path)
  if (!name) throw new Error(`Expected ${path} to declare a package name.`)

  return name
}
