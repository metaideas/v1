import { rm } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"
import * as z from "zod"

export const TemplateCleanupSchema = z.object({
  cleanupPaths: z.array(z.string()),
  cleanupSections: z.array(z.string()),
})

export type TemplateCleanup = z.infer<typeof TemplateCleanupSchema>

export const TEMPLATE_SECTION_START = "<!-- TEMPLATE:START -->"
const TEMPLATE_SECTION_END = "<!-- TEMPLATE:END -->"

// Setup replaces the template README, which carries this marker, with one that describes the
// project. A README that still has the marker was never rewritten.
const TEMPLATE_README_MARKER = "<!-- TEMPLATE:README -->"

export function checkIsTemplateReadme(contents: string) {
  return contents.includes(TEMPLATE_README_MARKER)
}

function checkIsPathWithinRoot(rootDir: string, path: string) {
  const pathFromRoot = relative(rootDir, path)

  return (
    pathFromRoot !== ""
    && pathFromRoot !== ".."
    && !pathFromRoot.startsWith(`..${sep}`)
    && !isAbsolute(pathFromRoot)
  )
}

export function resolvePathWithinRoot(rootDir: string, relativePath: string) {
  const resolvedRootDir = resolve(rootDir)
  const path = resolve(resolvedRootDir, relativePath)

  if (!checkIsPathWithinRoot(resolvedRootDir, path)) {
    throw new Error(`Cleanup path must be within the project: ${relativePath}.`)
  }

  return path
}

export async function removePath(rootDir: string, relativePath: string) {
  await rm(resolvePathWithinRoot(rootDir, relativePath), { force: true, recursive: true })
}

export function checkIsRemovedByCleanup(
  rootDir: string,
  relativePath: string,
  cleanupPaths: readonly string[]
) {
  const path = resolve(rootDir, relativePath)

  return cleanupPaths.some((cleanupPath) => {
    const cleanupTarget = resolve(rootDir, cleanupPath)
    return path === cleanupTarget || checkIsPathWithinRoot(cleanupTarget, path)
  })
}

function joinAroundRemovedSection(before: string, after: string) {
  const trailingNewlines = /\n*$/.exec(before)?.[0] ?? ""
  const leadingNewlines = /^\n*/.exec(after)?.[0] ?? ""
  const isAtStart = before.length === trailingNewlines.length
  const isAtEnd = after.length === leadingNewlines.length

  if (isAtStart) return after.slice(leadingNewlines.length)
  if (isAtEnd) return `${before.slice(0, before.length - trailingNewlines.length)}\n`
  if (trailingNewlines.length === 0 || leadingNewlines.length === 0) return before + after

  return `${before.slice(0, before.length - trailingNewlines.length)}\n\n${after.slice(leadingNewlines.length)}`
}

export function removeTemplateSections(contents: string) {
  let remaining = contents

  while (remaining.includes(TEMPLATE_SECTION_START)) {
    const start = remaining.indexOf(TEMPLATE_SECTION_START)
    const end = remaining.indexOf(TEMPLATE_SECTION_END, start)
    if (end === -1) {
      throw new Error(`Expected ${TEMPLATE_SECTION_END} after each ${TEMPLATE_SECTION_START}.`)
    }

    remaining = joinAroundRemovedSection(
      remaining.slice(0, start),
      remaining.slice(end + TEMPLATE_SECTION_END.length)
    )
  }

  return remaining
}
