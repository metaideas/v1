import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { openTextFileOptions, saveTextFileOptions } from "#features/local-files/data.ts"

export function useTextFileEditor() {
  const [contents, setContents] = useState("")
  const [path, setPath] = useState<string>()
  const saveFile = useMutation(saveTextFileOptions)

  const openFile = useMutation({
    ...openTextFileOptions,
    onSuccess: (file) => {
      if (!file) return
      saveFile.reset()
      setContents(file.contents)
      setPath(file.path)
    },
  })

  const isSaved =
    saveFile.isSuccess
    && saveFile.variables.contents === contents
    && saveFile.variables.path === path

  function editContents(nextContents: string) {
    saveFile.reset()
    setContents(nextContents)
  }

  function save() {
    if (!path) return
    saveFile.mutate({ contents, path })
  }

  return { contents, editContents, isSaved, openFile, path, save, saveFile }
}
