import { readFile, writeFile } from "node:fs/promises"
import { dialog, type WebContents } from "electron"
import { LocalFilesFault } from "#shared/bridge/local-files.ts"
import { handle } from "#shell/bridge/handle.ts"

// Only paths that the user selected through the open dialog are writable, and only from the window
// that opened them.
const openedPaths = new WeakMap<WebContents, Set<string>>()

export const open = handle.localFiles.open(async (_input, { context }) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [
      {
        extensions: ["json", "md", "txt"],
        name: "Text",
      },
    ],
    properties: ["openFile"],
  })

  const selectedPath = filePaths[0]

  if (canceled || !selectedPath) return null

  const paths = openedPaths.get(context.sender) ?? new Set()
  paths.add(selectedPath)
  openedPaths.set(context.sender, paths)

  return {
    contents: await readFile(selectedPath, "utf8"),
    path: selectedPath,
  }
})

export const save = handle.localFiles.save(async (file, { context }) => {
  if (!openedPaths.get(context.sender)?.has(file.path)) {
    throw LocalFilesFault.create("UnselectedPathError", { path: file.path }).withMessage(
      "Cannot save to a path that the open dialog did not select"
    )
  }

  await writeFile(file.path, file.contents, "utf8")
})
