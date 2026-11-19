import { configDefaults, defineConfig } from "vitest/config"

// The template commands in scripts/ and the template recipes in turbo/generators/ are not
// workspaces, so the root runs their tests. Each workspace runs its own, including scripts/create.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "scripts/create/**"],
    include: ["scripts/**/*.test.ts", "turbo/**/*.test.ts"],
  },
})
