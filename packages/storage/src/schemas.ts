import * as z from "@v1/utils/schema"

export const FileKeySchema = z
  .string()
  .regex(/^[\w.-]+(?:\/[\w.-]+)*$/u)
  .refine((value) => value.split("/").every((segment) => segment !== "." && segment !== ".."))
