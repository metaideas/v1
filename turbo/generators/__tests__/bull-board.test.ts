import { describe, expect, test } from "bun:test"
import Bun from "bun"

import { readTheme } from "../commands/bull-board"

describe("readTheme", () => {
  test("reads the light and dark tokens from the packages/ui stylesheet", async () => {
    const css = await Bun.file(
      `${import.meta.dir}/../../../packages/ui/src/styles/globals.css`
    ).text()
    const theme = readTheme(css)

    expect(theme.light.primary).toBe("oklch(0.205 0 0)")
    expect(theme.light.radius).toBe("0.625rem")
    expect(theme.dark.primary).toBe("oklch(0.985 0 0)")
    expect(theme.dark.sidebar).toBe("oklch(0.205 0 0)")
    expect(theme.dark.destructive).toBe("oklch(0.637 0.237 25.331)")
  })

  test("leaves out tokens that bull-board reads differently", () => {
    const theme = readTheme(
      ":root {\n  --primary: red;\n  --chart-1: blue;\n  --destructive-foreground: red;\n  --sidebar-primary: blue;\n  --brand: green;\n}\n"
    )

    expect(theme.light.primary).toBe("red")
    expect(theme.light).not.toContainAnyKeys([
      "brand",
      "chart-1",
      "destructive-foreground",
      "sidebar-primary",
    ])
  })

  test("colours destructive with destructive-foreground when the stylesheet declares it", () => {
    expect(
      readTheme(".dark {\n  --destructive: maroon;\n  --destructive-foreground: red;\n}\n").dark
        .destructive
    ).toBe("red")
    expect(readTheme(".dark {\n  --destructive: red;\n}\n").dark.destructive).toBe("red")
  })

  test("keeps a font the stylesheet declares over the Tailwind default", () => {
    const theme = readTheme(":root {\n  --font-sans: Inter, sans-serif;\n}\n")

    expect(theme.light["font-sans"]).toBe("Inter, sans-serif")
  })

  test("marks hovered and selected items with the accent colours in both themes", () => {
    const theme = readTheme(":root {\n  --primary: red;\n}\n")

    expect(theme.light["state-selected"]).toBe("var(--accent)")
    expect(theme.dark["sidebar-state-selected"]).toBe("var(--sidebar-accent)")
  })
})
