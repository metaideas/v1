import type { Logger } from "@v1/core/services/logging"
import type { Adapter, FilesPlugin, StoredFile, UploadResult } from "files-sdk"
import type { AllowedOrigins } from "files-sdk/api"
import type { MemoryAdapterOptions } from "files-sdk/memory"
import { StorageFault, StorageSyncError } from "@v1/core/errors"
import { createFiles, handlers } from "files-sdk"
import { createFilesRouter } from "files-sdk/api"
import { bunS3 } from "files-sdk/bun-s3"
import { contentType } from "files-sdk/content-type"
import { memory } from "files-sdk/memory"
import { signedUrlPolicy } from "files-sdk/signed-url-policy"
import { validation } from "files-sdk/validation"
import * as try$ from "tryharder"
import {
  STORAGE_ALLOWED_TYPES,
  STORAGE_MAX_LIST_RESULTS,
  STORAGE_MAX_UPLOAD_SIZE,
  STORAGE_MAX_URL_AGE,
} from "#constants.ts"
import { FileKeySchema } from "#schemas.ts"

type S3AdapterOptions = {
  accessKeyId: string
  bucket: string
  /**
   * S3-compatible endpoint, such as MinIO from Docker Compose. Without it, the adapter addresses
   * AWS S3 with virtual-hosted-style URLs.
   */
  endpoint?: string
  region?: string
  secretAccessKey: string
}

/**
 * A file that storage holds after a successful upload or `head`, in the shape an application
 * records it.
 */
export type StoredFileRecord = {
  etag?: string
  key: string
  lastModified?: number
  metadata?: Record<string, string>
  name: string
  size: number
  type: string
}

type SyncCallbacks = {
  /**
   * Records a file after an upload or `head` succeeds. The operation waits for it, and a failure is
   * logged without failing the operation.
   */
  onFileStored?: (file: StoredFileRecord) => Promise<unknown>
  /**
   * Removes the record of a deleted key. A bulk delete calls it once for each key.
   */
  onFileDeleted?: (key: string) => Promise<unknown>
}

type FileStorageOptions = SyncCallbacks & {
  adapter: Adapter
  logger?: Logger
}

type FileStorageRouterOptions = {
  allowedOrigins: AllowedOrigins
  /**
   * Returns the key prefix that scopes the current request, such as `users/<id>/`. Every gateway
   * operation stays inside it.
   */
  getKeyPrefix: () => string
  secret: string
  storage: FileStorage
}

export type FileStorage = ReturnType<typeof createFileStorage>

const GATEWAY_OPERATIONS = [
  "capabilities",
  "delete",
  "download",
  "exists",
  "head",
  "list",
  "search",
  "signedUploadUrl",
  "upload",
  "url",
] as const

function getUploadedFileRecord(key: string, file: UploadResult): StoredFileRecord {
  return {
    etag: file.etag,
    key,
    lastModified: file.lastModified,
    name: key.split("/").at(-1) ?? key,
    size: file.size,
    type: file.contentType,
  }
}

function getStoredFileRecord(key: string, file: StoredFile): StoredFileRecord {
  return {
    etag: file.etag,
    key,
    lastModified: file.lastModified,
    metadata: file.metadata,
    name: file.name,
    size: file.size,
    type: file.type,
  }
}

function createSyncPlugin({
  logger,
  onFileDeleted,
  onFileStored,
}: SyncCallbacks & { logger?: Logger }): FilesPlugin {
  async function sync(
    operation: StorageSyncError["operation"],
    key: string,
    write: () => Promise<unknown>
  ) {
    const result = await try$.run({
      catch: (error) => StorageFault.wrap(error).as("StorageSyncError", { key, operation }),
      try: write,
    })

    if (result instanceof StorageSyncError) {
      logger?.error({
        error: result,
        key,
        message: "Failed to sync a stored file",
        scope: "storage",
      })
    }
  }

  return {
    name: "sync",
    wrap: handlers({
      delete: async (operation, next) => {
        await next(operation)
        if (onFileDeleted) {
          await sync("delete", operation.key, () => onFileDeleted(operation.key))
        }
      },
      head: async (operation, next) => {
        const file = await next(operation)
        if (onFileStored) {
          await sync("store", operation.key, () =>
            onFileStored(getStoredFileRecord(operation.key, file))
          )
        }
        return file
      },
      upload: async (operation, next) => {
        const result = await next(operation)
        if (onFileStored) {
          await sync("store", operation.key, () =>
            onFileStored(getUploadedFileRecord(operation.key, result))
          )
        }
        return result
      },
    }),
  }
}

export function createS3Adapter({ endpoint, ...options }: S3AdapterOptions) {
  return bunS3({ ...options, endpoint, virtualHostedStyle: !endpoint })
}

export function createMemoryAdapter(options?: MemoryAdapterOptions) {
  return memory(options)
}

export function createFileStorage({
  adapter,
  logger,
  onFileDeleted,
  onFileStored,
}: FileStorageOptions) {
  return createFiles({
    adapter,
    plugins: [
      createSyncPlugin({ logger, onFileDeleted, onFileStored }),
      signedUrlPolicy({
        maxExpiresIn: STORAGE_MAX_URL_AGE,
        maxUploadSize: STORAGE_MAX_UPLOAD_SIZE,
      }),
      validation({
        allowedTypes: [...STORAGE_ALLOWED_TYPES],
        key: (key) => FileKeySchema.safeParse(key).success,
        maxSize: STORAGE_MAX_UPLOAD_SIZE,
        minSize: 1,
      }),
      contentType({ onMismatch: "reject" }),
    ],
  })
}

export function createFileStorageRouter({
  allowedOrigins,
  getKeyPrefix,
  secret,
  storage,
}: FileStorageRouterOptions) {
  return createFilesRouter({
    allowedOrigins,
    authorize: () => ({
      disposition: "attachment",
      keyPrefix: getKeyPrefix(),
      maxExpiresIn: STORAGE_MAX_URL_AGE,
      maxResults: STORAGE_MAX_LIST_RESULTS,
    }),
    files: storage,
    maxListLimit: STORAGE_MAX_LIST_RESULTS,
    maxSearchResults: STORAGE_MAX_LIST_RESULTS,
    maxUploadSize: STORAGE_MAX_UPLOAD_SIZE,
    operations: GATEWAY_OPERATIONS,
    secret,
  })
}
