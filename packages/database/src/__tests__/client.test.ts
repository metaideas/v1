import { sql } from "drizzle-orm"
import { describe, expect, test, vi } from "vitest"
import { createDatabase } from "#client.ts"

describe("createDatabase", () => {
  test("logs the parameterized query without its bound values", async () => {
    const logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    const database = createDatabase({ logger, url: "postgres://localhost:1/unused" })
    await database.$client.end()

    await database.execute(sql`SELECT ${"review-only-session-token"}`).catch(() => null)

    expect(logger.debug).toHaveBeenCalledWith({ query: "SELECT $1", scope: "drizzle" })
    expect(JSON.stringify(logger.debug.mock.calls)).not.toContain("review-only-session-token")
  })
})
