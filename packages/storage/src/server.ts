import type { Adapter, FilesHooks } from "files-sdk"
import type { AllowedOrigins } from "files-sdk/api"
import { createFiles } from "files-sdk"
import { createFilesRouter } from "files-sdk/api"
import { bunS3 } from "files-sdk/bun-s3"
import { contentType } from "files-sdk/content-type"
import { memory } from "files-sdk/memory"
import { signedUrlPolicy } from "files-sdk/signed-url-policy"
import { validation } from "files-sdk/validation"
import {
  STORAGE_ALLOWED_TYPES,
  STORAGE_MAX_LIST_RESULTS,
  STORAGE_MAX_UPLOAD_SIZE,
  STORAGE_MAX_URL_AGE,
} from "#constants.ts"
import { FileKeySchema } from "#schemas.ts"

export type { FilesActionEvent } from "files-sdk"

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

type FileStorageOptions = {
  adapter: Adapter
  hooks?: FilesHooks
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

export function createS3Adapter({ endpoint, ...options }: S3AdapterOptions) {
  return bunS3({ ...options, endpoint, virtualHostedStyle: !endpoint })
}

export function createMemoryAdapter() {
  return memory()
}

export function createFileStorage({ adapter, hooks }: FileStorageOptions) {
  return createFiles({
    adapter,
    hooks,
    plugins: [
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
