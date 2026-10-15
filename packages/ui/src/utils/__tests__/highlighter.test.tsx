import { describe, expect, test } from "bun:test"
import { isValidElement, type ReactNode } from "react"

import { loadHighlighter } from "#utils/highlighter.tsx"

function getStyles(line: ReactNode) {
  return (Array.isArray(line) ? line : [line]).map((token: unknown) =>
    isValidElement<{ style?: unknown }>(token) ? token.props.style : undefined
  )
}

describe("loadHighlighter", () => {
  test("keeps an ANSI color active across a newline", async () => {
    const highlighter = await loadHighlighter("ansi")
    const [first, second] = highlighter?.highlight("\u001B[31mred\nstill red\u001B[0m").lines ?? []

    expect(getStyles(second)).toEqual(getStyles(first))
  })
})
