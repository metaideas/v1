import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { getExpoAppId, renameProject } from "../rename"

const EXPO_CONFIG = 'const APP_ID = "v1"\nconst APP_NAME = "v1"\n'

const directories: string[] = []

async function createProject(configPath: string) {
  const rootDir = await mkdtemp(join(tmpdir(), "rename-"))
  directories.push(rootDir)
  const path = join(rootDir, configPath)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, EXPO_CONFIG)

  return rootDir
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { force: true, recursive: true })))
})

describe("getExpoAppId", () => {
  test("keeps a lowercase hyphenated name", () => {
    expect(getExpoAppId("my-app")).toBe("my-app")
  })

  test("lowercases an uppercase name", () => {
    expect(getExpoAppId("MyApp")).toBe("myapp")
  })

  test("prefixes a name that starts with a digit", () => {
    expect(getExpoAppId("123-project")).toBe("app-123-project")
  })
})

describe("renameProject", () => {
  test.each([
    ["the repository root", "apps/mobile/app.config.js"],
    ["a copied workspace", "app.config.js"],
  ])("renames the Expo app from %s", async (_, configPath) => {
    const rootDir = await createProject(configPath)

    await renameProject({ rootDir, scope: "123-Project", sourceScope: "v1" })

    expect(await readFile(join(rootDir, configPath), "utf8")).toBe(
      'const APP_ID = "app-123-project"\nconst APP_NAME = "123-Project"\n'
    )
  })
})
