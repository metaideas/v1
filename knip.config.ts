import type { KnipConfig } from "knip"
import { existsSync, globSync } from "node:fs"
import path from "node:path"
import { readWorkspace } from "@tooling/linting/workspace"
import analyze, { ignoreDependencies } from "adamantite/analyze"

// Knip skips loading a config file that only re-exports another package (webpro-nl/knip@ab775b1),
// so it never reads `include` from the vitest.config.ts files that re-export @tooling/testing.
// Drop this entry once Knip loads those files.
const vitest = { entry: "src/**/*.test.{ts,tsx}" }

const SOURCE_FILES = { project: "src/**/*.{js,jsx,ts,tsx}" }

// Each workspace declares its own Knip settings in the `workspace` field of its package.json, so
// removing a workspace removes them too. Knip uses the most specific entry for a workspace without
// merging, so declared settings replace the defaults for applications and packages.
function configureWorkspace(directory: string) {
  const absolute = path.join(import.meta.dirname, directory)
  const tests = existsSync(path.join(absolute, "vitest.config.ts")) ? { vitest } : {}
  const { knip } = readWorkspace(absolute)

  if (knip !== undefined) return { ...tests, ...knip }
  if (directory.startsWith("tooling/")) return Object.keys(tests).length > 0 ? tests : undefined
  return { ...SOURCE_FILES, ...tests }
}

const workspaces = Object.fromEntries(
  globSync("{apps,packages,tooling}/*/package.json", { cwd: import.meta.dirname }).flatMap(
    (file) => {
      const directory = path.dirname(file)
      const config = configureWorkspace(directory)
      return config === undefined ? [] : [[directory, config]]
    }
  )
)

export default {
  ...analyze,
  ignoreDependencies: ignoreDependencies.monorepo,
  ignoreExportsUsedInFile: true,
  ignoreFiles: [],
  ignoreIssues: {
    "**/env.generated.ts": ["exports", "types"],
  },
  rules: {
    ...analyze.rules,
    binaries: "error",
    dependencies: "error",
    devDependencies: "off",
    duplicates: "error",
    enumMembers: "off",
    exports: "error",
    files: "error",
    nsExports: "error",
    nsTypes: "error",
    optionalPeerDependencies: "warn",
    types: "error",
    unlisted: "error",
    unresolved: "error",
  },
  workspaces: {
    ".": {
      // Each script a skill runs with `node` is an entry. Their shared modules are reached by import.
      entry: [".agents/skills/*/scripts/{restore,setup,upstream}.ts"],
      project: ["turbo/generators/**/*.ts", ".agents/skills/*/scripts/**/*.ts"],
    },
    ...workspaces,
  },
} satisfies KnipConfig
