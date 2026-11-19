import { describe, expect, test } from "vitest"

import { registerBullBoardGenerator } from "../bull-board"
import { API_CLOSE_BODY, API_ENTRYPOINT } from "./fixtures/api-entrypoint"
import { runRecipe } from "./run-recipe"

describe("registerBullBoardGenerator", () => {
  test("closes the jobs dashboard when apps/api closes", async () => {
    const { files, reports } = await runRecipe(
      registerBullBoardGenerator,
      {},
      {
        "apps/api/.env.schema": "",
        "apps/api/package.json": JSON.stringify({ dependencies: { "@bull-board/hono": "0.0.0" } }),
        "apps/api/src/index.ts": API_ENTRYPOINT,
        "packages/jobs/package.json": JSON.stringify({ name: "@v1/jobs" }),
      }
    )

    expect(reports).toContain("apps/api/src/index.ts: connected bull-board")
    expect(API_CLOSE_BODY.exec(files["apps/api/src/index.ts"] ?? "")?.groups?.body).toContain(
      "await jobsDashboard?.close()"
    )

    const repeated = await runRecipe(registerBullBoardGenerator, {}, files)
    expect(repeated.reports).toContain("[SKIPPED] apps/api/src/index.ts already uses bull-board")
    expect(repeated.files).toEqual(files)
  })
})
