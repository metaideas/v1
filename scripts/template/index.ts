import { defineCommand } from "citty"

import add from "./add.ts"
import diff from "./diff.ts"
import doctor from "./doctor.ts"
import remove from "./remove.ts"
import setup from "./setup.ts"

export default defineCommand({
  meta: {
    description: "Configure and maintain this template project",
    name: "template",
  },
  subCommands: { add, diff, doctor, remove, setup },
})
