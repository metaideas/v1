import { describe, expect, mock, test } from "bun:test"
import { StorageSyncError } from "@v1/core/errors"
import { ValidationError } from "files-sdk/validation"
import type { StoredFileRecord } from "#server.ts"
import { createFileStorage, createMemoryAdapter } from "#server.ts"

const PDF = new TextEncoder().encode("%PDF-1.4\n%v1\n")
const PDF_OPTIONS = { contentType: "application/pdf" }

function createLogger() {
  return { debug: mock(), error: mock(), info: mock(), warn: mock() }
}

describe("createFileStorage", () => {
  test("records an uploaded file after storage accepts it", async () => {
    const onFileStored = mock((_file: StoredFileRecord) => Promise.resolve())
    const storage = createFileStorage({ adapter: createMemoryAdapter(), onFileStored })

    await storage.upload("users/u1/report.pdf", PDF, PDF_OPTIONS)

    expect(onFileStored).toHaveBeenCalledTimes(1)
    expect(onFileStored.mock.calls[0]?.[0]).toMatchObject({
      key: "users/u1/report.pdf",
      name: "report.pdf",
      size: PDF.byteLength,
      type: "application/pdf",
    })
  })

  test("records a file read with head, including its metadata", async () => {
    const onFileStored = mock((_file: StoredFileRecord) => Promise.resolve())
    const storage = createFileStorage({
      adapter: createMemoryAdapter({
        initial: {
          "users/u1/report.pdf": {
            body: PDF,
            contentType: "application/pdf",
            metadata: { source: "import" },
          },
        },
      }),
      onFileStored,
    })

    await storage.head("users/u1/report.pdf")

    expect(onFileStored).toHaveBeenCalledTimes(1)
    expect(onFileStored.mock.calls[0]?.[0]).toMatchObject({
      key: "users/u1/report.pdf",
      metadata: { source: "import" },
      type: "application/pdf",
    })
  })

  test("removes the record of a deleted file", async () => {
    const onFileDeleted = mock((_key: string) => Promise.resolve())
    const storage = createFileStorage({
      adapter: createMemoryAdapter({ initial: { "users/u1/report.pdf": PDF } }),
      onFileDeleted,
    })

    await storage.delete("users/u1/report.pdf")

    expect(onFileDeleted.mock.calls).toEqual([["users/u1/report.pdf"]])
  })

  test("removes one record for each key of a bulk delete", async () => {
    const onFileDeleted = mock((_key: string) => Promise.resolve())
    const storage = createFileStorage({
      adapter: createMemoryAdapter({
        initial: { "users/u1/a.pdf": PDF, "users/u1/b.pdf": PDF },
      }),
      onFileDeleted,
    })

    await storage.delete(["users/u1/a.pdf", "users/u1/b.pdf"])

    expect(onFileDeleted.mock.calls.map(([key]) => key).toSorted()).toEqual([
      "users/u1/a.pdf",
      "users/u1/b.pdf",
    ])
  })

  test("waits for the record write before the operation resolves", async () => {
    const write = Promise.withResolvers<boolean>()
    const storage = createFileStorage({
      adapter: createMemoryAdapter(),
      onFileStored: () => write.promise,
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
    const storage = createFileStorage({
      adapter: createMemoryAdapter(),
      logger,
      onFileStored: () => Promise.reject(new Error("database unavailable")),
    })

    const result = await storage.upload("users/u1/report.pdf", PDF, PDF_OPTIONS)

    expect(result.key).toBe("users/u1/report.pdf")
    expect(await storage.exists("users/u1/report.pdf")).toBe(true)
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error.mock.calls[0]?.[0]).toMatchObject({ key: "users/u1/report.pdf" })
    expect(logger.error.mock.calls[0]?.[0].error).toBeInstanceOf(StorageSyncError)
  })

  test("skips the record when storage rejects the operation", async () => {
    const onFileStored = mock((_file: StoredFileRecord) => Promise.resolve())
    const storage = createFileStorage({ adapter: createMemoryAdapter(), onFileStored })

    const error = await storage
      .upload("users/u1/notes.txt", "hello", { contentType: "text/plain" })
      .catch((error: unknown) => error)

    expect(error).toBeInstanceOf(Error)
    expect(onFileStored).not.toHaveBeenCalled()
  })

  test("signs direct uploads instead of refusing them", async () => {
    const storage = createFileStorage({ adapter: createMemoryAdapter() })

    const target = await storage.signedUploadUrl("users/u1/report.pdf", { expiresIn: 60 })

    expect(target.url).toContain("users/u1/report.pdf")
  })

  test("rejects an upload whose declared type is not allowed", async () => {
    const onFileStored = mock((_file: StoredFileRecord) => Promise.resolve())
    const storage = createFileStorage({ adapter: createMemoryAdapter(), onFileStored })

    const error = await storage
      .upload("users/u1/page.html", "<p>hi</p>", { contentType: "text/html" })
      .catch((error: unknown) => error)

    expect(error).toBeInstanceOf(ValidationError)
    expect(await storage.exists("users/u1/page.html")).toBe(false)
    expect(onFileStored).not.toHaveBeenCalled()
  })

  test("deletes a directly uploaded file of a disallowed type when it is completed", async () => {
    const onFileStored = mock((_file: StoredFileRecord) => Promise.resolve())
    const adapter = createMemoryAdapter({
      initial: { "users/u1/page.html": { body: "<p>hi</p>", contentType: "text/html" } },
    })
    const storage = createFileStorage({ adapter, onFileStored })

    const error = await storage.head("users/u1/page.html").catch((error: unknown) => error)

    expect(error).toBeInstanceOf(ValidationError)
    expect(adapter.raw.has("users/u1/page.html")).toBe(false)
    expect(onFileStored).not.toHaveBeenCalled()
  })
})
