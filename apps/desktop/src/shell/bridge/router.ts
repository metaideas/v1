import { ipcMain } from "electron"
import { createRouter } from "typedport"
import { toWire } from "typedport/wire"
import { desktopContract, isExposedError } from "#shared/bridge/contract.ts"
import { log } from "#shared/logger.ts"
import * as localFiles from "#shell/bridge/local-files.ts"

const router = createRouter(desktopContract, { localFiles })

/**
 * Registers one IPC handler per contract channel. The router parses every payload before a resolver
 * runs, because renderer input is untrusted.
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
