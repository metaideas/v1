import path from "node:path"
import { app, BrowserWindow } from "electron"
import isSquirrelStartup from "electron-squirrel-startup"
import { serveBridge } from "#shell/bridge/router.ts"

if (isSquirrelStartup) {
  app.quit()
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
  serveBridge()
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
