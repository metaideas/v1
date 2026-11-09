import type { KnipConfig } from "knip"
import analyze, { ignoreDependencies } from "adamantite/analyze"

// Knip skips loading a config file that only re-exports another package (webpro-nl/knip@ab775b1),
// so it never reads `include` from the vitest.config.ts files that re-export @tooling/testing.
// Drop these entries once Knip loads those files.
const vitest = { entry: "src/**/*.test.{ts,tsx}" }

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
      project: "turbo/generators/**/*.ts",
    },
    "apps/*": {
      project: "src/**/*.{js,jsx,ts,tsx}",
    },
    "apps/app": {
      entry: "src/routeTree.gen.{ts,js}",
      vite: false,
      vitest,
    },
    "apps/desktop": {
      entry: [
        "src/shared/env.generated.ts",
        "src/shell/main.ts",
        "src/shell/preload.ts",
        "forge.config.ts",
      ],
      project: "src/**/*.{css,js,jsx,ts,tsx}",
    },
    "apps/docs": {
      project: "src/**/*.{astro,css,js,jsx,mdx,ts,tsx}",
    },
    "apps/extension": {
      entry: ["src/entrypoints/**/*.{ts,tsx}", "src/shared/env.generated.ts", "wxt.config.ts"],
      project: "src/**/*.{css,js,jsx,ts,tsx}",
      wxt: false,
    },
    "apps/mobile": {
      entry: "src/shared/env.generated.ts",
      project: "src/**/*.{css,js,jsx,ts,tsx}",
    },
    "apps/web": {
      // Knip's Astro plugin lists src/content.config.ts but not the live collection config that the
      // emdash template recipe adds. Drop src/live.config.ts once the plugin lists it.
      entry: ["src/live.config.ts", "src/shared/env.generated.ts"],
      project: "src/**/*.{astro,css,js,jsx,mdx,ts,tsx}",
    },
    "packages/*": {
      project: "src/**/*.{js,jsx,ts,tsx}",
      vitest,
    },
    "packages/database": {
      drizzle: {
        config: [],
        entry: ["drizzle.config.ts", "src/relations.ts", "src/schema/index.ts"],
      },
      entry: ["scripts/*.ts"],
      vitest,
    },
    "packages/ui": {
      project: "src/**/*.{css,js,jsx,ts,tsx}",
      vitest,
    },
    "tooling/linting": {
      entry: "src/rules/*.ts",
      vitest,
    },
  },
} satisfies KnipConfig
