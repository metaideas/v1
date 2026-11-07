import * as Bun from "bun"

const schemaDirectory = "src/functions/components/better-auth"
const schemaPath = `${schemaDirectory}/schema.generated.ts`

await Bun.$`cd ${schemaDirectory} && bun x auth@1.7.18 generate --output schema.generated.ts -y`

const generatedSchema = await Bun.file(schemaPath).text()
const portableSchema = generatedSchema.replace(
  /^ \* {3}cd src\/functions\/components\/better-auth\n \* {3}npx auth generate --output .*$/m,
  " *   bun run --filter @v1/backend generate:auth"
)

await Bun.write(schemaPath, portableSchema)
