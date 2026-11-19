// Keep the shutdown anchor from apps/api/src/index.ts in a fixture the recipes cannot modify.
export const API_ENTRYPOINT = `import { lifecycle } from "@v1/utils/lifecycle"
import { database } from "#shared/services.ts"

async function close() {
  await Promise.all([
    database.$client.end(),
  ])
}

await lifecycle(async () => {}, { close })
`

export const API_CLOSE_BODY = /^async function close\(\) \{\n(?<body>[\s\S]*?)\n\}$/m
