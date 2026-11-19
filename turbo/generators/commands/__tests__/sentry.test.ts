import { describe, expect, test } from "vitest"

import { registerSentryGenerator } from "../sentry"
import { API_SHUTDOWN_BODY, API_ENTRYPOINT } from "./fixtures/api-entrypoint"
import { runRecipe } from "./run-recipe"

describe("registerSentryGenerator", () => {
  test("flushes the drain when apps/api closes", async () => {
    const { files, reports } = await runRecipe(
      registerSentryGenerator,
      { app: "api" },
      {
        "apps/api/.env.schema": "",
        "apps/api/package.json": JSON.stringify({ dependencies: { "@sentry/node": "0.0.0" } }),
        "apps/api/src/index.ts": API_ENTRYPOINT,
      }
    )

    expect(reports).toContain("apps/api/src/index.ts: connected Sentry")
    expect(API_SHUTDOWN_BODY.exec(files["apps/api/src/index.ts"] ?? "")?.groups?.body).toContain(
      "await drain?.flush()"
    )

    const repeated = await runRecipe(registerSentryGenerator, { app: "api" }, files)
    expect(repeated.reports).toContain("[SKIPPED] apps/api/src/index.ts already uses Sentry")
    expect(repeated.files).toEqual(files)
  })
})
