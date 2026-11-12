import { describe, expect, test } from "vitest"

import { registerPostHogGenerator } from "../posthog"
import { readTemplateFile, runRecipe } from "./run-recipe"

// The body of the function that closes the API's services on shutdown.
const CLOSE = /^async function close\(\) \{\n(?<body>[\s\S]*?)\n\}$/m

describe("registerPostHogGenerator", () => {
  test("shuts down analytics when apps/api closes", async () => {
    const { files, reports } = await runRecipe(
      registerPostHogGenerator,
      { app: "api" },
      {
        "apps/api/.env.schema": "",
        "apps/api/package.json": JSON.stringify({ dependencies: { "posthog-node": "0.0.0" } }),
        "apps/api/src/index.ts": await readTemplateFile("apps/api/src/index.ts"),
      }
    )

    expect(reports).toContain("apps/api/src/index.ts: connected PostHog")
    expect(CLOSE.exec(files["apps/api/src/index.ts"] ?? "")?.groups?.body).toContain(
      "await analytics?.shutdown()"
    )
  })
})
