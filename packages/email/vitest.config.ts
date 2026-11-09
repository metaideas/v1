import { defineConfig } from "vitest/config"

// The shared tsconfig preserves JSX for the bundlers that build the apps, so tests compile it here.
// `include` repeats Vitest's default so Knip, which reads this config, still finds the tests.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
})
