import { describe, expect, mock, test } from "bun:test"
import { StorageSyncError } from "@v1/core/errors"
import { ValidationError } from "files-sdk/validation"
import type { AssetRecord } from "#server.ts"
import {
  createAssetsStorage,
  createAssetsStorageRouter,
  createMemoryAdapter,
  createS3Adapter,
} from "#server.ts"

const PDF = new TextEncoder().encode("%PDF-1.4\n%v1\n")
const PDF_OPTIONS = { contentType: "application/pdf" }

function createLogger() {
  return { debug: mock(), error: mock(), info: mock(), warn: mock() }
}

async function presignUpload(type: string) {
  const router = createAssetsStorageRouter({
    allowedOrigins: [],
    getKeyPrefix: () => "users/u1/",
    secret: "x".repeat(32),
    // Signing a POST policy is local, so these credentials never reach a bucket.
    storage: createAssetsStorage({
      adapter: createS3Adapter({
        accessKeyId: "test",
        bucket: "assets",
        endpoint: "http://localhost:9000",
        region: "us-east-1",
        secretAccessKey: "test",
      }),
    }),
  })
  const response = await router.handle(
    new Request("http://localhost/files", {
      body: JSON.stringify({ files: [{ name: "file", size: 16, type }], op: "presign" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  )
  const body = (await response.json()) as { uploads: Array<{ target: { url: string } }> }
  return body.uploads[0]?.target.url ?? ""
}

describe("createAssetsStorage", () => {
  test("records an uploaded file after storage accepts it", async () => {
    const onAssetStored = mock((_file: AssetRecord) => Promise.resolve())
    const storage = createAssetsStorage({ adapter: createMemoryAdapter(), onAssetStored })

    await storage.upload("users/u1/report.pdf", PDF, PDF_OPTIONS)

    expect(onAssetStored).toHaveBeenCalledTimes(1)
    expect(onAssetStored.mock.calls[0]?.[0]).toMatchObject({
      key: "users/u1/report.pdf",
      name: "report.pdf",
      size: PDF.byteLength,
      type: "application/pdf",
    })
  })

  test("records a file read with head, including its metadata", async () => {
    const onAssetStored = mock((_file: AssetRecord) => Promise.resolve())
    const storage = createAssetsStorage({
      adapter: createMemoryAdapter({
        initial: {
          "users/u1/report.pdf": {
            body: PDF,
            contentType: "application/pdf",
            metadata: { source: "import" },
          },
        },
      }),
      onAssetStored,
    })

    await storage.head("users/u1/report.pdf")

    expect(onAssetStored).toHaveBeenCalledTimes(1)
    expect(onAssetStored.mock.calls[0]?.[0]).toMatchObject({
      key: "users/u1/report.pdf",
      metadata: { source: "import" },
      type: "application/pdf",
    })
  })

  test("removes the record of a deleted file", async () => {
    const onAssetDeleted = mock((_key: string) => Promise.resolve())
    const storage = createAssetsStorage({
      adapter: createMemoryAdapter({ initial: { "users/u1/report.pdf": PDF } }),
      onAssetDeleted,
    })

    await storage.delete("users/u1/report.pdf")

    expect(onAssetDeleted.mock.calls).toEqual([["users/u1/report.pdf"]])
  })

  test("removes one record for each key of a bulk delete", async () => {
    const onAssetDeleted = mock((_key: string) => Promise.resolve())
    const storage = createAssetsStorage({
      adapter: createMemoryAdapter({
        initial: { "users/u1/a.pdf": PDF, "users/u1/b.pdf": PDF },
      }),
      onAssetDeleted,
    })

    await storage.delete(["users/u1/a.pdf", "users/u1/b.pdf"])

    expect(onAssetDeleted.mock.calls.map(([key]) => key).toSorted()).toEqual([
      "users/u1/a.pdf",
      "users/u1/b.pdf",
    ])
  })

  test("waits for the record write before the operation resolves", async () => {
    const write = Promise.withResolvers<boolean>()
    const storage = createAssetsStorage({
      adapter: createMemoryAdapter(),
      onAssetStored: () => write.promise,
    })
    const pending = Symbol("pending")

    const upload = storage.upload("users/u1/report.pdf", PDF, PDF_OPTIONS)
    expect(await Promise.race([upload, Bun.sleep(10).then(() => pending)])).toBe(pending)

    write.resolve(true)
    const result = await upload
    expect(result.key).toBe("users/u1/report.pdf")
  })

  test("logs a failed record write and keeps the successful storage result", async () => {
    const logger = createLogger()
    const storage = createAssetsStorage({
      adapter: createMemoryAdapter(),
      logger,
      onAssetStored: () => Promise.reject(new Error("database unavailable")),
    })

    const result = await storage.upload("users/u1/report.pdf", PDF, PDF_OPTIONS)

    expect(result.key).toBe("users/u1/report.pdf")
    expect(await storage.exists("users/u1/report.pdf")).toBe(true)
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error.mock.calls[0]?.[0]).toMatchObject({ key: "users/u1/report.pdf" })
    expect(logger.error.mock.calls[0]?.[0].error).toBeInstanceOf(StorageSyncError)
  })

  test("skips the record when storage rejects the operation", async () => {
    const onAssetStored = mock((_file: AssetRecord) => Promise.resolve())
    const storage = createAssetsStorage({ adapter: createMemoryAdapter(), onAssetStored })

    const error = await storage
      .upload("users/u1/notes.txt", "hello", { contentType: "text/plain" })
      .catch((error: unknown) => error)

    expect(error).toBeInstanceOf(Error)
    expect(onAssetStored).not.toHaveBeenCalled()
  })

  test("signs a direct upload of an allowed type", async () => {
    const storage = createAssetsStorage({ adapter: createMemoryAdapter() })

    const target = await storage.signedUploadUrl("users/u1/report.pdf", {
      contentType: "application/pdf",
      expiresIn: 60,
    })

    expect(target.url).toContain("users/u1/report.pdf")
  })

  test("refuses to sign a direct upload without an allowed type", async () => {
    const storage = createAssetsStorage({ adapter: createMemoryAdapter() })

    const [missing, disallowed] = await Promise.all([
      storage.signedUploadUrl("users/u1/a", { expiresIn: 60 }).catch((error: unknown) => error),
      storage
        .signedUploadUrl("users/u1/b.html", { contentType: "text/html", expiresIn: 60 })
        .catch((error: unknown) => error),
    ])

    expect(missing).toBeInstanceOf(ValidationError)
    expect(disallowed).toBeInstanceOf(ValidationError)
  })

  test("rejects an upload whose declared type is not allowed", async () => {
    const onAssetStored = mock((_file: AssetRecord) => Promise.resolve())
    const storage = createAssetsStorage({ adapter: createMemoryAdapter(), onAssetStored })

    const error = await storage
      .upload("users/u1/page.html", "<p>hi</p>", { contentType: "text/html" })
      .catch((error: unknown) => error)

    expect(error).toBeInstanceOf(ValidationError)
    expect(await storage.exists("users/u1/page.html")).toBe(false)
    expect(onAssetStored).not.toHaveBeenCalled()
  })

  test("deletes a directly uploaded file of a disallowed type when it is completed", async () => {
    const onAssetStored = mock((_file: AssetRecord) => Promise.resolve())
    const onAssetDeleted = mock((_key: string) => Promise.resolve())
    const adapter = createMemoryAdapter({
      initial: { "users/u1/page.html": { body: "<p>hi</p>", contentType: "text/html" } },
    })
    const storage = createAssetsStorage({ adapter, onAssetDeleted, onAssetStored })

    const error = await storage.head("users/u1/page.html").catch((error: unknown) => error)

    expect(error).toBeInstanceOf(ValidationError)
    expect(adapter.raw.has("users/u1/page.html")).toBe(false)
    expect(onAssetStored).not.toHaveBeenCalled()
    expect(onAssetDeleted.mock.calls).toEqual([["users/u1/page.html"]])
  })
})

describe("createAssetsStorageRouter", () => {
  test("signs a direct upload target for an allowed type", async () => {
    expect(await presignUpload("application/pdf")).not.toContain("op=proxy")
  })

  test("never signs a direct upload target for a disallowed type", async () => {
    expect(await presignUpload("text/html")).toContain("op=proxy")
  })
})
