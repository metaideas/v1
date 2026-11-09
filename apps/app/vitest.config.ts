import { defineConfig } from "vitest/config"

// Without this file, Vitest loads vite.config.ts, whose Varlock and TanStack Start plugins need the
// app's environment. `include` repeats Vitest's default so Knip, which reads this config, still
// finds the tests.
export default defineConfig({
  test: { include: ["src/**/*.test.{ts,tsx}"] },
})
