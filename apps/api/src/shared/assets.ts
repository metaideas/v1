import type { StoredFileRecord } from "@v1/storage/server"
import { operators } from "@v1/database/helpers/sql"
import { assets } from "@v1/database/schema"
import { UserIdSchema } from "@v1/database/schemas"
import type { AuthenticatedAppContext } from "#shared/types.ts"
import { context } from "#shared/utils.ts"

export async function upsertAsset(file: StoredFileRecord) {
  const ctx = context<AuthenticatedAppContext>()
  const userId = UserIdSchema.parse(ctx.var.session.user.id)
  const record = {
    etag: file.etag,
    lastModified: file.lastModified,
    metadata: file.metadata,
    name: file.name,
    size: file.size,
    type: file.type,
  }

  await ctx.var.db
    .insert(assets)
    .values({ ...record, key: file.key, ownerId: userId, uploaderId: userId })
    .onConflictDoUpdate({ set: { ...record, updatedAt: new Date() }, target: assets.key })
}

export async function deleteAsset(key: string) {
  const ctx = context<AuthenticatedAppContext>()
  const userId = UserIdSchema.parse(ctx.var.session.user.id)

  await ctx.var.db
    .delete(assets)
    .where(operators.and(operators.eq(assets.key, key), operators.eq(assets.ownerId, userId)))
}
