import { describe, expect, test } from "vitest"

import { registerBullBoardGenerator } from "../bull-board"
import { API_ENTRYPOINT, API_ROUTES, API_SHUTDOWN_BODY } from "./fixtures/api-entrypoint"
import { runRecipe } from "./run-recipe"

describe("registerBullBoardGenerator", () => {
  test("mounts the jobs dashboard and closes it when apps/api closes", async () => {
    const { files, reports } = await runRecipe(
      registerBullBoardGenerator,
      {},
      {
        "apps/api/.env.schema": "",
        "apps/api/package.json": JSON.stringify({ dependencies: { "@bull-board/hono": "0.0.0" } }),
        "apps/api/src/index.ts": API_ENTRYPOINT,
        "apps/api/src/routes/index.ts": API_ROUTES,
        "packages/jobs/package.json": JSON.stringify({ name: "@v1/jobs" }),
      }
    )

    expect(reports).toContain("apps/api/src/index.ts: connected bull-board")
    expect(API_SHUTDOWN_BODY.exec(files["apps/api/src/index.ts"] ?? "")?.groups?.body).toContain(
      "await jobsDashboard?.close()"
    )
    expect(reports).toContain("apps/api/src/routes/index.ts: connected bull-board")

    const repeated = await runRecipe(registerBullBoardGenerator, {}, files)
    expect(repeated.reports).toContain("[SKIPPED] apps/api/src/index.ts already uses bull-board")
    expect(repeated.files).toEqual(files)
  })
})
