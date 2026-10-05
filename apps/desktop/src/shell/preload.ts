import { contextBridge, ipcRenderer } from "electron"
import type { Bridge } from "#shared/bridge.ts"

// The typedport client is a Proxy, which `contextBridge` can't clone, so the preload exposes only
// the transport. Each feature builds its client in `data.ts`.
const bridge: Bridge = {
  send: (path, payload) => ipcRenderer.invoke(path, payload),
}

contextBridge.exposeInMainWorld("bridge", bridge)
