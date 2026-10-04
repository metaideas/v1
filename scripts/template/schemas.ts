import * as z from "zod"

const DependenciesSchema = z.record(z.string(), z.string()).optional()

export const PackageJsonSchema = z.looseObject({
  dependencies: DependenciesSchema,
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

export const TurboJsonSchema = z.object({
  tasks: z.record(z.string(), z.looseObject({ env: z.array(z.string()).optional() })),
})

export type PackageJson = z.infer<typeof PackageJsonSchema>
export type TemplateCleanup = z.infer<typeof TemplateCleanupSchema>
export type TemplateStamp = z.infer<typeof TemplateStampSchema>
