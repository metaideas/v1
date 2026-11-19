import { sql } from "drizzle-orm"
import { describe, expect, test, vi } from "vitest"
import { createDatabase } from "#server.ts"

describe("createDatabase", () => {
  test("logs the parameterized query without its bound values", async () => {
    const logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    const database = createDatabase({ logger, url: "postgres://localhost:1/unused" })
    await database.close()

    await database.execute(sql`SELECT ${"review-only-session-token"}`).catch(() => null)

    expect(logger.debug).toHaveBeenCalledWith({ query: "SELECT $1", scope: "drizzle" })
    expect(JSON.stringify(logger.debug.mock.calls)).not.toContain("review-only-session-token")
  })
})

// Runs against a Postgres server, such as the one from Docker Compose, when DATABASE_URL is set.
const url = process.env.DATABASE_URL ?? ""

function readTransactionId(transaction: { execute: ReturnType<typeof createDatabase>["execute"] }) {
  return transaction
    .execute<{ id: string }>(sql`SELECT txid_current()::text AS id`)
    .then(([row]) => row?.id)
}

describe("withTransaction", () => {
  test.skipIf(url === "")("reuses the open transaction in a nested call", async () => {
    const database = createDatabase({ url })

    try {
      const [outer, inner] = await database.withTransaction(async (transaction) => [
        await readTransactionId(transaction),
        await database.withTransaction((nested) => readTransactionId(nested)),
      ])

      expect(inner).toBe(outer)
    } finally {
      await database.close()
    }
  })

  test.skipIf(url === "")("gives concurrent calls their own transactions", async () => {
    const database = createDatabase({ url })
    const bothOpen = Promise.withResolvers<boolean>()
    // Calls that run one after the other never both open, so the barrier gives up well before the
    // test's timeout and the test fails instead of hanging.
    const deadline = setTimeout(() => {
      bothOpen.resolve(false)
    }, 2000)
    let openCount = 0

    function readWhileBothOpen() {
      return database.withTransaction(async (transaction) => {
        const id = await readTransactionId(transaction)
        openCount += 1
        if (openCount === 2) bothOpen.resolve(true)
        return { id, overlapped: await bothOpen.promise }
      })
    }

    try {
      const results = await Promise.all([readWhileBothOpen(), readWhileBothOpen()])

      expect(results.every(({ overlapped }) => overlapped)).toBe(true)
      expect(new Set(results.map(({ id }) => id)).size).toBe(2)
    } finally {
      clearTimeout(deadline)
      bothOpen.resolve(true)
      await database.close()
    }
  })

  test.skipIf(url === "")("opens its own transaction on another database", async () => {
    const first = createDatabase({ url })
    const second = createDatabase({ url })

    try {
      const [outer, other] = await first.withTransaction(async (transaction) => [
        await readTransactionId(transaction),
        await second.withTransaction((nested) => readTransactionId(nested)),
      ])

      expect(other).not.toBe(outer)
    } finally {
      await Promise.all([first.close(), second.close()])
    }
  })

  test.skipIf(url === "")("rolls back every write when a nested call throws", async () => {
    const database = createDatabase({ url })
    const table = `review_rollback_${Date.now()}`

    try {
      await database.execute(sql.raw(`CREATE TABLE ${table} (id int)`))
      const result = database.withTransaction(async (transaction) => {
        await transaction.execute(sql.raw(`INSERT INTO ${table} VALUES (1)`))
        await database.withTransaction(async (nested) => {
          await nested.execute(sql.raw(`INSERT INTO ${table} VALUES (2)`))
          throw new Error("nested failure")
        })
      })

      await expect(result).rejects.toThrow("nested failure")
      expect(await database.execute(sql.raw(`SELECT * FROM ${table}`))).toHaveLength(0)
    } finally {
      await database.execute(sql.raw(`DROP TABLE IF EXISTS ${table}`))
      await database.close()
    }
  })

  test.skipIf(url === "")("opens a new transaction for work that outlives its own", async () => {
    const database = createDatabase({ url })
    const released = Promise.withResolvers<boolean>()

    try {
      let later: Promise<string | undefined> | undefined
      const outer = await database.withTransaction(async (transaction) => {
        // Declared inside the transaction, so it inherits the transaction's async scope.
        async function readAfterRelease() {
          await released.promise
          return database.withTransaction((next) => readTransactionId(next))
        }
        later = readAfterRelease()
        return readTransactionId(transaction)
      })
      released.resolve(true)

      const after = await later
      expect(after).toBeDefined()
      expect(after).not.toBe(outer)
    } finally {
      released.resolve(true)
      await database.close()
    }
  })
})
