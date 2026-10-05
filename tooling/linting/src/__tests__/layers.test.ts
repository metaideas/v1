import { describe, expect, test } from "bun:test"
import {
  type Boundaries,
  findSourceRoot,
  findStrayFolder,
  findViolation,
  locate,
  resolveImport,
} from "#layers.ts"

const app: Boundaries = { routes: "routes" }
const desktop: Boundaries = {
  featureTiers: {
    components: "renderer",
    data: "renderer",
    handlers: "shell",
    hooks: "renderer",
  },
  routes: "renderer/routes",
  tiers: ["renderer", "shell"],
}

function check(file: string, specifier: string, boundaries: Boundaries = app) {
  const root = findSourceRoot(file)

  if (root === undefined) throw new Error(`No source root for ${file}`)

  const from = locate(root, boundaries, file)
  const target = resolveImport(root, file, specifier)
  const to = target === undefined ? undefined : locate(root, boundaries, target)

  if (from === undefined || target === undefined || to === undefined) return

  return findViolation(from, to, target)
}

describe("findSourceRoot", () => {
  test("finds the src folder of an application workspace", () => {
    expect(findSourceRoot("/repo/apps/app/src/routes/index.tsx")).toEqual({
      app: "app",
      path: "/repo/apps/app/src",
    })
  })

  test("ignores files outside application workspaces", () => {
    expect(findSourceRoot("/repo/packages/ui/src/components/button.tsx")).toBeUndefined()
  })
})

describe("findViolation", () => {
  test("lets shared import only shared", () => {
    expect(check("/repo/apps/app/src/shared/auth.ts", "#shared/utils.ts")).toBeUndefined()
    expect(check("/repo/apps/app/src/shared/auth.ts", "#features/auth/schemas.ts")).toBe(
      "sharedImportsUp"
    )
    expect(check("/repo/apps/app/src/shared/auth.ts", "../router.tsx")).toBe("sharedImportsUp")
  })

  test("lets a feature import shared and itself", () => {
    const file = "/repo/apps/app/src/features/auth/handlers.ts"

    expect(check(file, "#shared/auth.ts")).toBeUndefined()
    expect(check(file, "#features/auth/schemas.ts")).toBeUndefined()
    expect(check(file, "./schemas.ts")).toBeUndefined()
  })

  test("rejects a feature importing another feature", () => {
    expect(
      check("/repo/apps/app/src/features/auth/handlers.ts", "#features/theme/schemas.ts")
    ).toBe("featureImportsFeature")
  })

  test("rejects a feature importing routes or entrypoints", () => {
    const file = "/repo/apps/app/src/features/auth/handlers.ts"

    expect(check(file, "#routes/index.tsx")).toBe("featureImportsComposition")
    expect(check(file, "#router.tsx")).toBe("featureImportsComposition")
  })

  test("rejects a route importing another route", () => {
    const file = "/repo/apps/app/src/routes/_authenticated/index.tsx"

    expect(check(file, "#routes/__root.tsx")).toBe("routeImportsRoute")
    expect(check(file, "./route.tsx")).toBe("routeImportsRoute")
    expect(check(file, "./")).toBe("routeImportsRoute")
    expect(check(file, "#routes")).toBe("routeImportsRoute")
  })

  test("lets a route import assets, features, shared, and its entrypoint", () => {
    const file = "/repo/apps/app/src/routes/__root.tsx"

    expect(check(file, "./styles.css")).toBeUndefined()
    expect(check(file, "#features/theme/handlers.ts")).toBeUndefined()
    expect(check(file, "#shared/utils.ts")).toBeUndefined()
    expect(check(file, "#router.tsx")).toBeUndefined()
  })

  test("lets routes compose each other when the app declares no route folder", () => {
    expect(check("/repo/apps/api/src/routes/index.ts", "#routes/trpc.ts", {})).toBeUndefined()
  })

  test("rejects entrypoint tiers importing each other", () => {
    expect(check("/repo/apps/desktop/src/renderer/main.tsx", "#shell/main.ts", desktop)).toBe(
      "tierImportsTier"
    )
    expect(check("/repo/apps/desktop/src/shell/main.ts", "#renderer/main.tsx", desktop)).toBe(
      "tierImportsTier"
    )
    expect(
      check("/repo/apps/desktop/src/renderer/routes/files.tsx", "#shell/preload.ts", desktop)
    ).toBe("tierImportsTier")
  })

  test("lets entrypoint tiers import shared", () => {
    expect(
      check("/repo/apps/desktop/src/shell/main.ts", "#shared/bridge.ts", desktop)
    ).toBeUndefined()
  })

  test("puts a feature's tiered roles in their tier", () => {
    const feature = "/repo/apps/desktop/src/features/local-files"

    expect(check(`${feature}/data.ts`, "./handlers.ts", desktop)).toBe("tierImportsTier")
    expect(
      check(`${feature}/components/file-editor.tsx`, "#features/local-files/handlers.ts", desktop)
    ).toBe("tierImportsTier")
    expect(check(`${feature}/handlers.ts`, "./hooks.ts", desktop)).toBe("tierImportsTier")
    expect(check(`${feature}/handlers/open.ts`, "../data.ts", desktop)).toBe("tierImportsTier")
    expect(
      check("/repo/apps/desktop/src/shell/bridge.ts", `#features/local-files/data.ts`, desktop)
    ).toBe("tierImportsTier")
    expect(
      check(
        "/repo/apps/desktop/src/renderer/routes/files.tsx",
        "#features/local-files/handlers.ts",
        desktop
      )
    ).toBe("tierImportsTier")
  })

  test("lets each tier import its own roles and the untiered ones", () => {
    const feature = "/repo/apps/desktop/src/features/local-files"

    expect(check(`${feature}/handlers.ts`, "./schemas.ts", desktop)).toBeUndefined()
    expect(check(`${feature}/data.ts`, "./schemas.ts", desktop)).toBeUndefined()
    expect(check(`${feature}/hooks.ts`, "./data.ts", desktop)).toBeUndefined()
    expect(
      check("/repo/apps/desktop/src/shell/bridge.ts", "#features/local-files/handlers.ts", desktop)
    ).toBeUndefined()
    expect(
      check(
        "/repo/apps/desktop/src/renderer/routes/files.tsx",
        "#features/local-files/components/editor.tsx",
        desktop
      )
    ).toBeUndefined()
  })

  test("rejects an untiered role importing a tiered one", () => {
    const feature = "/repo/apps/desktop/src/features/local-files"

    expect(check(`${feature}/schemas.ts`, "./handlers.ts", desktop)).toBe("untieredImportsTier")
    expect(check(`${feature}/errors.ts`, "./data.ts", desktop)).toBe("untieredImportsTier")
  })

  test("leaves features untiered when the app declares no feature tiers", () => {
    expect(
      check("/repo/apps/app/src/features/auth/components/form.tsx", "#features/auth/handlers.ts")
    ).toBeUndefined()
  })

  test("ignores package imports", () => {
    expect(check("/repo/apps/app/src/shared/auth.ts", "@v1/auth/client")).toBeUndefined()
  })
})

describe("findStrayFolder", () => {
  const root = { app: "app", path: "/repo/apps/app/src" }

  test("allows entrypoints at the source root", () => {
    expect(findStrayFolder(root, app, "/repo/apps/app/src/router.tsx")).toBeUndefined()
  })

  test("allows shared, features, routes, tiers, and declared folders", () => {
    expect(findStrayFolder(root, app, "/repo/apps/app/src/shared/auth.ts")).toBeUndefined()
    expect(findStrayFolder(root, app, "/repo/apps/app/src/features/auth/hooks.ts")).toBeUndefined()
    expect(findStrayFolder(root, app, "/repo/apps/app/src/routes/index.tsx")).toBeUndefined()
    expect(findStrayFolder(root, desktop, "/repo/apps/app/src/shell/main.ts")).toBeUndefined()
    expect(
      findStrayFolder(root, { folders: ["entrypoints"] }, "/repo/apps/app/src/entrypoints/popup.ts")
    ).toBeUndefined()
  })

  test("reports a folder outside the layers", () => {
    expect(findStrayFolder(root, app, "/repo/apps/app/src/utils/format.ts")).toBe("utils")
    expect(findStrayFolder(root, {}, "/repo/apps/app/src/routes/index.tsx")).toBe("routes")
  })
})
