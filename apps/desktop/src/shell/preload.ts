import { contextBridge, ipcRenderer } from "electron"
import { type DesktopBridge, IPC_CHANNELS } from "#shared/desktop-bridge.ts"

const bridge: DesktopBridge = {
  openTextFile: () => ipcRenderer.invoke(IPC_CHANNELS.openTextFile),
  saveTextFile: (file) => ipcRenderer.invoke(IPC_CHANNELS.saveTextFile, file),
}

contextBridge.exposeInMainWorld("desktop", bridge)
