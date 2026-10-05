import { ipcMain } from "electron"
import { mergeRouters } from "typedport"
import { toWire } from "typedport/wire"
import { localFilesRouter } from "#features/local-files/handlers.ts"
import { isExposedError } from "#shared/bridge.ts"
import { log } from "#shared/logger.ts"

// Throws at startup if two features declare the same channel.
const router = mergeRouters(localFilesRouter)

/**
 * Registers one IPC handler per channel. The router parses every payload before a resolver runs,
 * because renderer input is untrusted.
 */
export function serveBridge() {
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
