import starlight from "@astrojs/starlight"
import { paraglideVitePlugin as paraglide } from "@inlang/paraglide-js"
import tailwindcss from "@tailwindcss/vite"
import varlock from "@varlock/astro-integration"
import { defineConfig } from "astro/config"

import { DOCS_DESCRIPTION, DOCS_URL, SITE_NAME } from "./src/shared/constants.ts"
import { ENV } from "./src/shared/env.generated.ts"

export default defineConfig({
  integrations: [
    varlock(),
    starlight({
      components: {
        Head: "./src/shared/components/head.astro",
      },
      customCss: ["./src/shared/styles/globals.css"],
      defaultLocale: "root",
      description: DOCS_DESCRIPTION,
      disable404Route: true,
      lastUpdated: true,
      locales: {
        es: {
          label: "Español",
          lang: "es",
        },
        root: {
          label: "English",
          lang: "en",
        },
      },
      sidebar: [
        {
          items: [
            { label: "Introduction", slug: "", translations: { es: "Introducción" } },
            {
              label: "Getting Started",
              slug: "getting-started",
              translations: { es: "Primeros pasos" },
            },
          ],
          label: "Start Here",
          translations: { es: "Empieza aquí" },
        },
        {
          items: [{ autogenerate: { directory: "guides" } }],
          label: "Guides",
          translations: { es: "Guías" },
        },
        {
          items: [{ autogenerate: { directory: "reference" } }],
          label: "Reference",
          translations: { es: "Referencia" },
        },
      ],
      title: SITE_NAME,
    }),
  ],
  output: "static",
  server: {
    port: ENV.PORT,
  },
  site: ENV.PUBLIC_SITE_URL ?? DOCS_URL,
  vite: {
    plugins: [
      tailwindcss(),
      paraglide({
        outdir: "./src/shared/internationalization",
        project: "../../tooling/internationalization/project.inlang",
        strategy: ["url", "globalVariable", "baseLocale"],
      }),
    ],
  },
})
