import type { UploadRecord } from "@v1/storage/server"
import { operators } from "@v1/database/helpers/sql"
import { uploads } from "@v1/database/schema"
import { UserIdSchema } from "@v1/database/schemas"
import type { AccessTokenAppContext } from "#shared/types.ts"
import { context } from "#shared/utils.ts"

export async function upsertUpload(file: UploadRecord) {
  const ctx = context<AccessTokenAppContext>()
  const userId = UserIdSchema.parse(ctx.var.userId)
  const record = {
    etag: file.etag,
    lastModified: file.lastModified,
    metadata: file.metadata,
    name: file.name,
    size: file.size,
    type: file.type,
  }

  await ctx.var.db
    .insert(uploads)
    .values({ ...record, key: file.key, ownerId: userId })
    .onConflictDoUpdate({ set: { ...record, updatedAt: new Date() }, target: uploads.key })
}

export async function deleteUpload(key: string) {
  const ctx = context<AccessTokenAppContext>()
  const userId = UserIdSchema.parse(ctx.var.userId)

  await ctx.var.db
    .delete(uploads)
    .where(operators.and(operators.eq(uploads.key, key), operators.eq(uploads.ownerId, userId)))
}
