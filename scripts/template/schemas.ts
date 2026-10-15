import * as z from "zod"

const DependenciesSchema = z.record(z.string(), z.string()).optional()

export const PackageJsonSchema = z.looseObject({
  dependencies: DependenciesSchema,
  description: z.string().optional(),
  devDependencies: DependenciesSchema,
  name: z.string().optional(),
  peerDependencies: DependenciesSchema,
})

export const TemplateCleanupSchema = z.object({
  cleanupPaths: z.array(z.string()),
  cleanupSections: z.array(z.string()),
})

export const TemplateStampSchema = z.object({
  commit: z.string().optional(),
  createdAt: z.string(),
  template: z.string(),
})

export const GitHubCommitSchema = z.object({ sha: z.string() })

// The default export of `knip.config.ts`.
export const KnipConfigModuleSchema = z.object({
  default: z.looseObject({ workspaces: z.record(z.string(), z.unknown()).optional() }),
})

export const TurboJsonSchema = z.object({
  tasks: z.record(z.string(), z.looseObject({ env: z.array(z.string()).optional() })),
})

export type KnipConfig = z.infer<typeof KnipConfigModuleSchema>["default"]
export type PackageJson = z.infer<typeof PackageJsonSchema>
export type TemplateCleanup = z.infer<typeof TemplateCleanupSchema>
export type TemplateStamp = z.infer<typeof TemplateStampSchema>
