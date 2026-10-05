import { mutationOptions } from "@tanstack/react-query"
import { createClient } from "typedport"
import { type LocalTextFile, localFilesContract } from "#features/local-files/schemas.ts"
import { transport } from "#shared/bridge.ts"

const shell = createClient(localFilesContract, transport)

export const openTextFileOptions = mutationOptions({
  mutationFn: () => shell.localFiles.open(),
  mutationKey: ["local-files", "open"],
})

export const saveTextFileOptions = mutationOptions({
  mutationFn: (file: LocalTextFile) => shell.localFiles.save(file),
  mutationKey: ["local-files", "save"],
})
