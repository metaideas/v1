import type { WebContents } from "electron"
import type { Transport } from "typedport"
import * as Faultier from "faultier"
import { fromWire } from "typedport/wire"

/**
 * The preload exposes this on `globalThis.bridge`. It forwards each call to the shell unchanged.
 */
export type Bridge = {
  send: (path: string, payload: unknown) => Promise<unknown>
}

declare global {
  // Only `var` attaches the property to the `globalThis` type.
  var bridge: Bridge
}

/**
 * What a feature's handlers learn about the call. `sender` is the window that made it.
 */
export type ShellContext = {
  sender: WebContents
}

/**
 * Carries a feature's client calls to the shell. Pass it to `createClient` in the feature's
 * `data.ts`.
 */
export const transport: Transport = async (path, payload) =>
  fromWire(await globalThis.bridge.send(path, payload))

/**
 * Faults that features define reach the renderer with their message. Every other failure, such as a
 * file system error, crosses as `internal`.
 */
export function isExposedError(error: unknown) {
  return Faultier.isFault(error)
}
