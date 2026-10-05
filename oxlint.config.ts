import core from "adamantite/lint"
import custom from "adamantite/lint/custom"
import node from "adamantite/lint/node"
import react from "adamantite/lint/react"
import reactStrict from "adamantite/lint/react-strict"
import strict from "adamantite/lint/strict"
import { defineConfig } from "oxlint"

const APP_BOUNDARIES = {
  api: { folders: ["routes"] },
  app: { routes: "routes" },
  desktop: {
    // A feature's handlers run in the main process; its UI and data layer run in the renderer.
    featureTiers: {
      components: "renderer",
      data: "renderer",
      handlers: "shell",
      hooks: "renderer",
    },
    routes: "renderer/routes",
    tiers: ["renderer", "shell"],
  },
  docs: { routes: "pages" },
  extension: { folders: ["entrypoints"] },
  mobile: { routes: "app" },
  web: { routes: "pages" },
  worker: {},
}

export default defineConfig({
  extends: [
    core,
    strict,
    react,
    reactStrict,
    node,
    custom({
      dir: "./tooling/linting/src/rules",
      name: "v1",
      rules: {
        "layer-folders": ["error", APP_BOUNDARIES],
        layers: ["error", APP_BOUNDARIES],
      },
    }),
  ],
  ignorePatterns: [
    "**/*.hbs",
    "**/src/**/_generated",
    "**/*.d.ts",
    "**/*.gen.ts",
    "**/*.generated.ts",
  ],
  options: {
    respectEslintDisableDirectives: true,
    typeAware: true,
    typeCheck: true,
  },
  overrides: [
    {
      files: ["**/src/**"],
      rules: {
        "import/no-relative-parent-imports": "error",
      },
    },
    {
      files: ["packages/ui/**"],
      rules: {
        // shadcn components put ARIA roles on styled divs; native tags such as `fieldset` add their own styling and behavior.
        "jsx-a11y/prefer-tag-over-role": "off",
      },
    },
    {
      files: ["apps/mobile/babel.config.js", "apps/mobile/metro.config.js"],
      rules: {
        "import/unambiguous": "off",
        "typescript/no-require-imports": "off",
        "typescript/no-var-requires": "off",
        "unicorn/prefer-module": "off",
      },
    },
  ],
  rules: {
    "adamantite/no-react-state-hooks": [
      "error",
      { allow: ["**/use[A-Z]*.{ts,tsx}", "**/use-*.{ts,tsx}", "**/hooks/**", "**/hooks.{ts,tsx}"] },
    ],
    "react/jsx-no-constructed-context-values": "off",
    "typescript/consistent-type-definitions": ["error", "type"],
  },
})
