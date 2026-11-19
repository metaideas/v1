import { describe, expect, test } from "vitest"

import { registerPostHogGenerator } from "../posthog"
import { API_SHUTDOWN_BODY, API_ENTRYPOINT } from "./fixtures/api-entrypoint"
import { runRecipe } from "./run-recipe"

describe("registerPostHogGenerator", () => {
  test("shuts down analytics when apps/api closes", async () => {
    const { files, reports } = await runRecipe(
      registerPostHogGenerator,
      { app: "api" },
      {
        "apps/api/.env.schema": "",
        "apps/api/package.json": JSON.stringify({ dependencies: { "posthog-node": "0.0.0" } }),
        "apps/api/src/index.ts": API_ENTRYPOINT,
      }
    )

    expect(reports).toContain("apps/api/src/index.ts: connected PostHog")
    expect(API_SHUTDOWN_BODY.exec(files["apps/api/src/index.ts"] ?? "")?.groups?.body).toContain(
      "await analytics?.shutdown()"
    )

    const repeated = await runRecipe(registerPostHogGenerator, { app: "api" }, files)
    expect(repeated.reports).toContain("[SKIPPED] apps/api/src/index.ts already uses PostHog")
    expect(repeated.files).toEqual(files)
  })
})
