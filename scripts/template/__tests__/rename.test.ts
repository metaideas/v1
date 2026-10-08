import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { getExpoAppId, renameProject } from "../rename"

const EXPO_CONFIG = 'const APP_ID = "v1"\nconst APP_NAME = "v1"\n'

const directories: string[] = []

async function createProject(configPath: string) {
  const rootDir = await mkdtemp(join(tmpdir(), "rename-"))
  directories.push(rootDir)
  await Bun.write(join(rootDir, configPath), EXPO_CONFIG)

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

    expect(await Bun.file(join(rootDir, configPath)).text()).toBe(
      'const APP_ID = "app-123-project"\nconst APP_NAME = "123-Project"\n'
    )
  })
})
