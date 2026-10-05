import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import {
  addDesktopContract,
  type DesktopHandlers,
  serveDesktopRouter,
} from "../commands/new-feature"

const BRIDGE = `import { ipcMain } from "electron"
import { localFilesRouter } from "#features/local-files/handlers.ts"

const routers = [localFilesRouter]
`

let dir: string
let handlers: DesktopHandlers

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "new-feature-"))
  handlers = {
    bridgePath: path.join(dir, "bridge.ts"),
    contract: "reviewNotesContract",
    feature: "review-notes",
    key: "reviewNotes",
    router: "reviewNotesRouter",
    schemasPath: path.join(dir, "schemas.ts"),
  }
  await writeFile(handlers.bridgePath, BRIDGE)
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

async function runDesktopHandlerSteps() {
  return [await addDesktopContract(handlers), await serveDesktopRouter(handlers)]
}

describe("desktop handlers", () => {
  test("adds the contract to a feature generated earlier without handlers, then serves its router", async () => {
    await writeFile(handlers.schemasPath, 'export const featureName = "review-notes"\n')

    await runDesktopHandlerSteps()

    const schemas = await readFile(handlers.schemasPath, "utf8")
    expect(schemas).toContain('export const featureName = "review-notes"')
    expect(schemas).toContain("export const reviewNotesContract = defineContract({")
    expect(schemas).toMatch(/import \{ channel, defineContract \} from "typedport"/)
    expect(schemas).toMatch(/import \* as z from "zod"/)

    const bridge = await readFile(handlers.bridgePath, "utf8")
    expect(bridge).toContain("const routers = [localFilesRouter, reviewNotesRouter]")
    expect(bridge).toMatch(
      /import \{ reviewNotesRouter \} from "#features\/review-notes\/handlers\.ts"/
    )
  })

  test("declares the contract in a new schemas.ts", async () => {
    await runDesktopHandlerSteps()

    const schemas = await readFile(handlers.schemasPath, "utf8")
    expect(schemas).toMatch(/^import /)
    expect(schemas).toContain("export const reviewNotesContract = defineContract({")
  })

  test("skips both steps when the contract and router already exist", async () => {
    await runDesktopHandlerSteps()
    const schemas = await readFile(handlers.schemasPath, "utf8")
    const bridge = await readFile(handlers.bridgePath, "utf8")

    expect(await runDesktopHandlerSteps()).toEqual([
      `[SKIPPED] ${handlers.schemasPath} already declares reviewNotesContract`,
      `[SKIPPED] ${handlers.bridgePath} already serves reviewNotesRouter`,
    ])
    expect(await readFile(handlers.schemasPath, "utf8")).toBe(schemas)
    expect(await readFile(handlers.bridgePath, "utf8")).toBe(bridge)
  })

  test("leaves the shell unchanged when the contract can't be declared", async () => {
    const schemas =
      'import * as z from "@v1/utils/schema"\n\nexport const NoteSchema = z.string()\n'
    await writeFile(handlers.schemasPath, schemas)

    const [contract, router] = await runDesktopHandlerSteps()

    expect(contract).toStartWith("[MANUAL]")
    expect(router).toStartWith("[MANUAL]")
    expect(await readFile(handlers.schemasPath, "utf8")).toBe(schemas)
    expect(await readFile(handlers.bridgePath, "utf8")).toBe(BRIDGE)
  })
})
