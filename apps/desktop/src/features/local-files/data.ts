import { mutationOptions } from "@tanstack/react-query"
import type { LocalTextFile } from "#shared/bridge/local-files.ts"
import { shell } from "#shared/bridge/client.ts"

export const openTextFileOptions = mutationOptions({
  mutationFn: () => shell.localFiles.open(),
  mutationKey: ["local-files", "open"],
})

export const saveTextFileOptions = mutationOptions({
  mutationFn: (file: LocalTextFile) => shell.localFiles.save(file),
  mutationKey: ["local-files", "save"],
})
