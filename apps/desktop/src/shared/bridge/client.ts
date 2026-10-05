import { createClient } from "typedport"
import { fromWire } from "typedport/wire"
import { type Bridge, desktopContract } from "#shared/bridge/contract.ts"

declare global {
  // Only `var` attaches the property to the `globalThis` type.
  var bridge: Bridge
}

export const shell = createClient(desktopContract, async (path, payload) =>
  fromWire(await globalThis.bridge.send(path, payload))
)
