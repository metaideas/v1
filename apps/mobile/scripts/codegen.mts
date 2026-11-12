import { compile } from "@inlang/paraglide-js"

await compile({
  outdir: "./src/shared/internationalization",
  project: "../../tooling/internationalization/project.inlang",
  strategy: ["globalVariable", "baseLocale"],
})
