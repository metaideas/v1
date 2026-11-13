import * as z from "@v1/utils/schema"

export const LogMessageSchema = z.string()

// Inngest reports failures as `{ err }`, and other packages log them under `error`.
export const LogFieldsSchema = z.looseObject({ err: z.unknown().optional() })
