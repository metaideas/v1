import { defineCommand, runMain } from "citty"

import template from "./template/index.ts"

const main = defineCommand({
  meta: {
    description: "Run project and template commands",
    name: "pnpm scripts",
  },
  subCommands: {
    template,
  },
})

await runMain(main)
