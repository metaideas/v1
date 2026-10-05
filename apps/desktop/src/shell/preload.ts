import { contextBridge, ipcRenderer } from "electron"
import type { Bridge } from "#shared/bridge/contract.ts"

// The typedport client is a Proxy, which `contextBridge` can't clone, so the preload exposes only
// the transport. The renderer builds the client in `#shared/bridge/client.ts`.
const bridge: Bridge = {
  send: (path, payload) => ipcRenderer.invoke(path, payload),
}

contextBridge.exposeInMainWorld("bridge", bridge)
