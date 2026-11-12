import { execFileSync } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"

const schemaDirectory = "src/functions/components/better-auth"
const schemaPath = `${schemaDirectory}/schema.generated.ts`

execFileSync("pnpm", ["dlx", "auth@1.7.18", "generate", "--output", "schema.generated.ts", "-y"], {
  cwd: schemaDirectory,
  stdio: "inherit",
})

const generatedSchema = await readFile(schemaPath, "utf8")
const portableSchema = generatedSchema.replace(
  /^ \* {3}cd src\/functions\/components\/better-auth\n \* {3}npx auth generate --output .*$/m,
  " *   pnpm run --filter @v1/backend generate:auth"
)

await writeFile(schemaPath, portableSchema)
