import type * as z from "@v1/utils/schema"
import type { FilesActionEvent } from "files-sdk"
import { operators } from "@v1/database/helpers/sql"
import { assets } from "@v1/database/schema"
import { UserIdSchema } from "@v1/database/schemas"
import * as try$ from "tryharder"
import type { AuthenticatedAppContext } from "#shared/types.ts"
import { AssetRecordError, FileActionError, FilesFault } from "#shared/errors.ts"
import { log } from "#shared/logger.ts"
import { DeleteManyResultSchema, StoredFileSchema, UploadResultSchema } from "#shared/schemas.ts"
import { context } from "#shared/utils.ts"

type ParsedUploadResult = z.infer<typeof UploadResultSchema>
type ParsedStoredFile = z.infer<typeof StoredFileSchema>

export const FILES_MAX_UPLOAD_SIZE = 10 * 1024 * 1024
export const FILES_MAX_URL_AGE = 15 * 60

async function recordAssets(
  operation: AssetRecordError["operation"],
  keys: string[],
  write: () => Promise<unknown>
) {
  const result = await try$.run({
    catch: (error) => FilesFault.wrap(error).as("AssetRecordError", { keys, operation }),
    try: write,
  })

  if (result instanceof AssetRecordError) {
    log.error({ error: result.toSerializable(), message: "Failed to record asset changes" })
  }
}

function handleUpload(key: string, file: ParsedUploadResult | ParsedStoredFile) {
  const ctx = context<AuthenticatedAppContext>()
  const isUploadResult = "contentType" in file
  const mimeType = isUploadResult ? file.contentType : file.type
  const metadata = isUploadResult ? undefined : file.metadata
  const name = isUploadResult ? (key.split("/").at(-1) ?? key) : file.name
  const userId = UserIdSchema.parse(ctx.var.session.user.id)

  void recordAssets("upsert", [key], () =>
    ctx.var.db
      .insert(assets)
      .values({
        etag: file.etag,
        key,
        lastModified: file.lastModified,
        metadata,
        name,
        ownerId: userId,
        size: file.size,
        type: mimeType,
        uploaderId: userId,
      })
      .onConflictDoUpdate({
        set: {
          etag: file.etag,
          lastModified: file.lastModified,
          metadata,
          name,
          size: file.size,
          type: mimeType,
          updatedAt: new Date(),
        },
        target: assets.key,
      })
  )
}

function handleDelete(keys: string[]) {
  if (keys.length === 0) return

  const ctx = context<AuthenticatedAppContext>()
  const userId = UserIdSchema.parse(ctx.var.session.user.id)

  void recordAssets("delete", keys, () =>
    ctx.var.db
      .delete(assets)
      .where(
        operators.and(operators.inArray(assets.key, keys), operators.eq(assets.ownerId, userId))
      )
  )
}

export function handleFileAction(event: FilesActionEvent) {
  if (event.status !== "success") return

  const result = try$.runSync({
    catch: (error) => FilesFault.wrap(error).as("FileActionError", { action: event.type }),
    try: () => {
      switch (event.type) {
        case "upload":
          if (event.key) handleUpload(event.key, UploadResultSchema.parse(event.result))
          break
        case "head":
          if (event.key) handleUpload(event.key, StoredFileSchema.parse(event.result))
          break
        case "delete": {
          const keys = event.key ? [event.key] : DeleteManyResultSchema.parse(event.result).deleted

          handleDelete(keys)
          break
        }
        default:
          break
      }
    },
  })

  if (result instanceof FileActionError) {
    log.error({
      error: result.toSerializable(),
      message: "Failed to process successful file action",
    })
  }
}
