import { mutationOptions } from "@tanstack/react-query"
import type { LocalTextFile } from "#shared/desktop-bridge.ts"

export const openTextFileOptions = mutationOptions({
  mutationFn: () => globalThis.desktop.openTextFile(),
  mutationKey: ["local-files", "open"],
})

export const saveTextFileOptions = mutationOptions({
  mutationFn: (file: LocalTextFile) => globalThis.desktop.saveTextFile(file),
  mutationKey: ["local-files", "save"],
})
