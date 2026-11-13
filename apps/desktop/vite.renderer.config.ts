import { paraglideVitePlugin as paraglide } from "@inlang/paraglide-js"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { varlockVitePlugin as varlock } from "@varlock/vite-integration"
import react from "@vitejs/plugin-react"
import { createSourceLocationPlugin, createStripPlugin } from "evlog/vite"
import { defineConfig } from "vite"
import { ENV } from "#shared/env.generated.ts"

export default defineConfig(() => ({
  build: {
    minify: "oxc" as const,
    // The renderer only runs in the Chromium version that Electron bundles.
    target: "esnext",
  },
  clearScreen: false,
  plugins: [
    devtools(),
    varlock(),
    createStripPlugin(["debug"]),
    createSourceLocationPlugin(),
    tailwindcss(),
    paraglide({
      outdir: "./src/shared/internationalization",
      project: "../../tooling/internationalization/project.inlang",
      strategy: ["localStorage", "baseLocale"],
    }),
    tanstackRouter({
      autoCodeSplitting: false,
      generatedRouteTree: "src/renderer/routeTree.gen.ts",
      routesDirectory: "src/renderer/routes",
      target: "react",
    }),
    react({ compiler: true }),
  ],
  resolve: {
    // The Forge Vite plugin turns `preserveSymlinks` on, which breaks package
    // resolution inside pnpm's symlinked workspace `node_modules`.
    preserveSymlinks: false,
  },
  server: {
    port: ENV.PORT,
    strictPort: true,
  },
}))
