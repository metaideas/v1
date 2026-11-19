import { existsSync, globSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, test } from "vitest"

const ROOT = path.join(import.meta.dirname, "..")
const DOCUMENTS = [
  "AGENTS.md",
  "CODING_STANDARDS.md",
  "README.md",
  ...globSync("docs/*.md", { cwd: ROOT }),
]

// Relative Markdown links, and `docs/<page>.md` mentions that agents follow like links.
function listReferences(document: string) {
  const contents = readFileSync(path.join(ROOT, document), "utf8")
  const links = [...contents.matchAll(/\]\((?<target>[^)\s#]*)[^)\s]*\)/g)].flatMap((match) => {
    const target = match.groups?.target ?? ""
    return target === "" || /^[a-z]+:/i.test(target)
      ? []
      : [path.join(path.dirname(document), target)]
  })
  const mentions = [...contents.matchAll(/`(?<path>docs\/[\w-]+\.md)`/g)].flatMap(
    (match) => match.groups?.path ?? []
  )

  return [...new Set([...links, ...mentions])]
}

describe("documentation links", () => {
  test.each(DOCUMENTS.filter((document) => existsSync(path.join(ROOT, document))))(
    "%s links only to files that exist",
    (document) => {
      const missing = listReferences(document).filter(
        (target) => !existsSync(path.join(ROOT, target))
      )

      expect(missing).toEqual([])
    }
  )
})
