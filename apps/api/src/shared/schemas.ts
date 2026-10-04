import * as z from "@v1/utils/schema"

export const FileKeySchema = z
  .string()
  .regex(/^[\w.-]+(?:\/[\w.-]+)*$/u)
  .refine((value) => value.split("/").every((segment) => segment !== "." && segment !== ".."))

export const UploadResultSchema = z.object({
  contentType: z.string(),
  etag: z.string().optional(),
  lastModified: z.number().optional(),
  size: z.number(),
})

export const StoredFileSchema = z.object({
  etag: z.string().optional(),
  lastModified: z.number().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
})

export const DeleteManyResultSchema = z.object({ deleted: z.array(z.string()) })
