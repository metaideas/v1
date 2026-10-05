import { readFile, writeFile } from "node:fs/promises"
import { dialog, type WebContents } from "electron"
import { LocalFilesFault } from "#features/local-files/errors.ts"
import { localFilesContract } from "#features/local-files/schemas.ts"
import { createShellRouter } from "#shared/bridge.ts"

// Only paths that the user selected through the open dialog are writable, and only from the window
// that opened them.
const openedPaths = new WeakMap<WebContents, Set<string>>()

export const localFilesRouter = createShellRouter(localFilesContract, {
  "localFiles.open": async (_input, { context }) => {
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
  },
  "localFiles.save": async (file, { context }) => {
    if (!openedPaths.get(context.sender)?.has(file.path)) {
      throw LocalFilesFault.create("UnselectedPathError", { path: file.path }).withMessage(
        "Cannot save to a path that the open dialog did not select"
      )
    }

    await writeFile(file.path, file.contents, "utf8")
  },
})
