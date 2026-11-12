import { paraglideVitePlugin as paraglide } from "@inlang/paraglide-js"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { I18N_COOKIE_NAME } from "@tooling/internationalization"
import { varlockVitePlugin as varlock } from "@varlock/vite-integration"
import react from "@vitejs/plugin-react"
import { createSourceLocationPlugin, createStripPlugin } from "evlog/vite"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"
import { ENV } from "#shared/env.generated.ts"

export default defineConfig(({ command }) => ({
  plugins: [
    devtools(),
    varlock(),
    createStripPlugin(["debug"]),
    createSourceLocationPlugin(),
    tailwindcss(),
    tanstackStart(),
    react({ compiler: true }),
    paraglide({
      cookieName: I18N_COOKIE_NAME,
      outdir: "./src/shared/internationalization",
      project: "../../tooling/internationalization/project.inlang",
      strategy: ["cookie", "baseLocale"],
    }),
    nitro({
      preset: "node-server",
    }),
  ],
  server: {
    port: ENV.PORT,
  },
  ssr: {
    // Bundle every dependency in the production server so CommonJS shims such as
    // `use-sync-external-store` require the same React copy as the rest of the bundle. The dev
    // module runner cannot evaluate CommonJS, so dev keeps Vite's default externals.
    noExternal: command === "build" ? true : undefined,
  },
}))
