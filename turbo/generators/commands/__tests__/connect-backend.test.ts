import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

import { listConnectionFiles } from "../connect-backend"

const TEMPLATES = join(import.meta.dirname, "../../templates/connect-backend")

const SUPPORTED = [
  { app: "app", auth: false, backend: "hono" },
  { app: "app", auth: true, backend: "trpc" },
  { app: "app", auth: false, backend: "convex" },
  { app: "desktop", auth: true, backend: "hono" },
  { app: "desktop", auth: false, backend: "trpc" },
  { app: "desktop", auth: false, backend: "convex" },
  { app: "extension", auth: true, backend: "hono" },
  { app: "extension", auth: false, backend: "trpc" },
  { app: "mobile", auth: true, backend: "hono" },
  { app: "mobile", auth: false, backend: "convex" },
] as const

describe("listConnectionFiles", () => {
  test.each(SUPPORTED)("maps $app with $backend to templates that exist", (connection) => {
    const files = listConnectionFiles({ ...connection, example: true })
    const missing = files.filter(([template]) => !existsSync(join(TEMPLATES, `${template}.hbs`)))

    expect(files.length).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  test("adds sign-in for convex on mobile, which requires it", () => {
    const targets = listConnectionFiles({
      app: "mobile",
      auth: false,
      backend: "convex",
      example: true,
    }).map(([, target]) => target)

    expect(targets).toContain("app/(auth)/(unauthenticated)/sign-in.tsx")
    expect(targets).toContain("app/(auth)/(authenticated)/convex-example.tsx")
  })

  test("rejects a connection the templates do not cover", () => {
    expect(() =>
      listConnectionFiles({ app: "mobile", auth: false, backend: "trpc", example: false })
    ).toThrow("apps/mobile can't connect to trpc.")
    expect(() =>
      listConnectionFiles({ app: "app", auth: true, backend: "convex", example: false })
    ).toThrow("apps/app can't sign in through convex.")
  })
})
