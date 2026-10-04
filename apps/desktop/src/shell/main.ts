import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { app, BrowserWindow, dialog, ipcMain } from "electron"
import isSquirrelStartup from "electron-squirrel-startup"
import { IPC_CHANNELS, type LocalTextFile } from "#shared/desktop-bridge.ts"
import { LocalFilesFault } from "#shared/errors.ts"

if (isSquirrelStartup) {
  app.quit()
}

// Only paths that the user selected through the open dialog are writable.
const openedPaths = new Set<string>()

function registerLocalFileHandlers() {
  ipcMain.handle(IPC_CHANNELS.openTextFile, async (): Promise<LocalTextFile | null> => {
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

    openedPaths.add(selectedPath)

    return {
      contents: await readFile(selectedPath, "utf8"),
      path: selectedPath,
    }
  })

  ipcMain.handle(IPC_CHANNELS.saveTextFile, async (_event, file: LocalTextFile) => {
    if (!openedPaths.has(file.path)) {
      throw LocalFilesFault.create("UnselectedPathError", { path: file.path }).withMessage(
        "Cannot save to a path that the open dialog did not select"
      )
    }

    await writeFile(file.path, file.contents, "utf8")
  })
}

function createWindow() {
  const window = new BrowserWindow({
    height: 600,
    // `packagerConfig.icon` does not apply on Linux; the window needs the icon
    // directly. The packaged file ships inside the renderer output via
    // `public/`; in development the renderer is served from memory, so the
    // icon resolves from the project directory instead.
    icon: MAIN_WINDOW_VITE_DEV_SERVER_URL
      ? path.join(app.getAppPath(), "public/icon.png")
      : path.join(import.meta.dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/icon.png`),
    title: "desktop",
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.cjs"),
    },
    width: 800,
  })

  // The renderer never opens new windows or leaves the application. Denying
  // both by default keeps a compromised renderer from loading remote content.
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  window.webContents.on("will-navigate", (navigation, url) => {
    const isDevServer =
      MAIN_WINDOW_VITE_DEV_SERVER_URL && url.startsWith(MAIN_WINDOW_VITE_DEV_SERVER_URL)

    if (!isDevServer) {
      navigation.preventDefault()
    }
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    void window.loadFile(
      path.join(import.meta.dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }
}

app.on("ready", () => {
  registerLocalFileHandlers()
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
