import { ipcMain } from "electron"
import { toWire } from "typedport/wire"
import { localFilesRouter } from "#features/local-files/handlers.ts"
import { isExposedError } from "#shared/bridge.ts"
import { log } from "#shared/logger.ts"

const routers = [localFilesRouter]

/**
 * Registers one IPC handler per channel of each feature's router. A router parses every payload
 * before its resolver runs, because renderer input is untrusted. Electron throws if two features
 * declare the same channel.
 */
export function serveBridge() {
  for (const router of routers) {
    for (const channel of router.channels) {
      ipcMain.handle(channel, (event, payload) =>
        toWire(router.dispatch(channel, payload, { context: { sender: event.sender } }), {
          expose: isExposedError,
          onHidden: (error) => {
            log.error({ error, message: "Bridge call failed" })
          },
        })
      )
    }
  }
}
