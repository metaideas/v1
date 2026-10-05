import { describe, expect, test } from "bun:test"
import {
  type Boundaries,
  findSourceRoot,
  findRestriction,
  findStrayFolder,
  findViolation,
  locate,
  resolveImport,
} from "#layers.ts"

const app: Boundaries = { routes: "routes" }
const desktop: Boundaries = {
  restricted: {
    "shared/bridge/client.ts": ["features", "renderer"],
    "shell/bridge": ["shell/bridge", "shell/main.ts"],
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
      check("/repo/apps/desktop/src/shell/main.ts", "#shared/bridge/contract.ts", desktop)
    ).toBeUndefined()
  })

  test("ignores package imports", () => {
    expect(check("/repo/apps/app/src/shared/auth.ts", "@v1/auth/client")).toBeUndefined()
  })
})

describe("findRestriction", () => {
  const root = { app: "desktop", path: "/repo/apps/desktop/src" }

  function restrict(file: string, specifier: string) {
    const target = resolveImport(root, file, specifier)

    if (target === undefined) throw new Error(`Cannot resolve ${specifier}`)

    return findRestriction(root, desktop, file, target)
  }

  test("lets allowed modules and folders import a restricted module", () => {
    expect(
      restrict("/repo/apps/desktop/src/features/local-files/data.ts", "#shared/bridge/client.ts")
    ).toBeUndefined()
    expect(
      restrict("/repo/apps/desktop/src/shell/main.ts", "#shell/bridge/router.ts")
    ).toBeUndefined()
    expect(
      restrict("/repo/apps/desktop/src/shell/bridge/router.ts", "./local-files.ts")
    ).toBeUndefined()
  })

  test("rejects other importers", () => {
    expect(restrict("/repo/apps/desktop/src/shell/main.ts", "#shared/bridge/client.ts")).toEqual([
      "features",
      "renderer",
    ])
    expect(restrict("/repo/apps/desktop/src/shell/preload.ts", "#shell/bridge/handle.ts")).toEqual([
      "shell/bridge",
      "shell/main.ts",
    ])
  })

  test("ignores unrestricted modules and folder name prefixes", () => {
    expect(
      restrict("/repo/apps/desktop/src/shell/preload.ts", "#shared/bridge/contract.ts")
    ).toBeUndefined()
    expect(
      restrict("/repo/apps/desktop/src/shell/preload.ts", "#shell/bridge-utils.ts")
    ).toBeUndefined()
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
