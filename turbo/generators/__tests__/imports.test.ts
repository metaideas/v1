import { describe, expect, test } from "bun:test"
import { parseModule } from "magicast"

import { addImports } from "../imports"

function getImports(source: string | undefined) {
  if (source === undefined) throw new Error("Expected addImports to edit the source.")

  return parseModule(source).imports.$items.map(({ from, imported, local }) => ({
    from,
    imported,
    local,
  }))
}

describe("addImports", () => {
  test("adds an import after the last import", () => {
    const output = addImports('import { log } from "#shared/logger.ts"\n\nlog.info("ready")\n', [
      { from: "#shared/monitoring.ts", imported: "drain" },
    ])

    expect(getImports(output)).toEqual([
      { from: "#shared/logger.ts", imported: "log", local: "log" },
      { from: "#shared/monitoring.ts", imported: "drain", local: "drain" },
    ])
    expect(output?.indexOf("drain")).toBeLessThan(output?.indexOf("log.info") ?? 0)
  })

  test("separates an import from the first statement of a source without imports", () => {
    const output = addImports("export default function RootLayout() {\n  return null\n}\n", [
      { from: "@sentry/react-native", imported: "*", local: "Sentry" },
    ])

    expect(getImports(output)).toEqual([
      { from: "@sentry/react-native", imported: "*", local: "Sentry" },
    ])
    expect(output).toMatch(/^import \* as Sentry from "@sentry\/react-native";?\nexport default/)
  })

  test("merges a named import into a value import from the same module", () => {
    const output = addImports('import { captureException } from "#shared/monitoring.ts"\n', [
      { from: "#shared/monitoring.ts", imported: "drain" },
    ])

    expect(output).toContain("import { captureException, drain }")
  })

  test("skips an import that the source already has", () => {
    const source = 'import { drain } from "#shared/monitoring.ts"\n'

    expect(addImports(source, [{ from: "#shared/monitoring.ts", imported: "drain" }])).toBe(source)
  })

  test("keeps a namespace import separate from named imports", () => {
    const output = addImports('import { captureException } from "@sentry/react-native"\n', [
      { from: "@sentry/react-native", imported: "*", local: "Sentry" },
    ])

    expect(getImports(output)).toEqual([
      { from: "@sentry/react-native", imported: "captureException", local: "captureException" },
      { from: "@sentry/react-native", imported: "*", local: "Sentry" },
    ])
  })

  test("adds a value import beside a type-only import from the same module", () => {
    const output = addImports('import type { captureException } from "#shared/monitoring.ts"\n', [
      { from: "#shared/monitoring.ts", imported: "drain" },
    ])

    expect(output).toContain('import type { captureException } from "#shared/monitoring.ts"')
    expect(output).toContain('import { drain } from "#shared/monitoring.ts"')
  })

  test("adds the requested name when the source imports the export under an alias", () => {
    const output = addImports('import { analytics as ph } from "#shared/analytics.ts"\n', [
      { from: "#shared/analytics.ts", imported: "analytics" },
    ])

    expect(getImports(output)).toContainEqual({
      from: "#shared/analytics.ts",
      imported: "analytics",
      local: "analytics",
    })
  })

  test("adds a second default import when the source names the default differently", () => {
    const output = addImports(
      'import ProductAnalytics from "#shared/components/analytics-provider.tsx"\n',
      [
        {
          from: "#shared/components/analytics-provider.tsx",
          imported: "default",
          local: "AnalyticsProvider",
        },
      ]
    )

    expect(getImports(output).map(({ local }) => local)).toEqual([
      "ProductAnalytics",
      "AnalyticsProvider",
    ])
  })

  test("returns undefined when the requested name is a type-only import", () => {
    expect(
      addImports('import type { drain } from "#shared/monitoring.ts"\n', [
        { from: "#shared/monitoring.ts", imported: "drain" },
      ])
    ).toBeUndefined()
  })

  test("returns undefined when the requested name refers to another module", () => {
    expect(
      addImports('import { drain } from "#shared/queue.ts"\n', [
        { from: "#shared/monitoring.ts", imported: "drain" },
      ])
    ).toBeUndefined()
  })
})
