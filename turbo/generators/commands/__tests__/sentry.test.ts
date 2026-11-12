import { describe, expect, test } from "vitest"

import { registerSentryGenerator } from "../sentry"
import { readTemplateFile, runRecipe } from "./run-recipe"

// The body of the function that closes the API's services on shutdown.
const CLOSE = /^async function close\(\) \{\n(?<body>[\s\S]*?)\n\}$/m

describe("registerSentryGenerator", () => {
  test("flushes the drain when apps/api closes", async () => {
    const { files, reports } = await runRecipe(
      registerSentryGenerator,
      { app: "api" },
      {
        "apps/api/.env.schema": "",
        "apps/api/package.json": JSON.stringify({ dependencies: { "@sentry/node": "0.0.0" } }),
        "apps/api/src/index.ts": await readTemplateFile("apps/api/src/index.ts"),
      }
    )

    expect(reports).toContain("apps/api/src/index.ts: connected Sentry")
    expect(CLOSE.exec(files["apps/api/src/index.ts"] ?? "")?.groups?.body).toContain(
      "await drain?.flush()"
    )
  })
})
