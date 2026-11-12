import { describe, expect, test } from "vitest"

import { registerBullBoardGenerator } from "../bull-board"
import { readTemplateFile, runRecipe } from "./run-recipe"

// The body of the function that closes the API's services on shutdown.
const CLOSE = /^async function close\(\) \{\n(?<body>[\s\S]*?)\n\}$/m

describe("registerBullBoardGenerator", () => {
  test("closes the jobs dashboard when apps/api closes", async () => {
    const { files, reports } = await runRecipe(
      registerBullBoardGenerator,
      {},
      {
        "apps/api/.env.schema": "",
        "apps/api/package.json": JSON.stringify({ dependencies: { "@bull-board/hono": "0.0.0" } }),
        "apps/api/src/index.ts": await readTemplateFile("apps/api/src/index.ts"),
        "packages/jobs/package.json": JSON.stringify({ name: "@v1/jobs" }),
      }
    )

    expect(reports).toContain("apps/api/src/index.ts: connected bull-board")
    expect(CLOSE.exec(files["apps/api/src/index.ts"] ?? "")?.groups?.body).toContain(
      "await jobsDashboard?.close()"
    )
  })
})
