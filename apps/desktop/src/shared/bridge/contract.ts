import { defineContract } from "typedport"
import { LocalFilesFault, localFiles } from "#shared/bridge/local-files.ts"

/**
 * Every capability that the shell serves to the renderer, one slice per capability.
 */
export const desktopContract = defineContract({ localFiles })

/**
 * The preload exposes this on `globalThis.bridge`. It forwards each call to the shell unchanged.
 */
export type Bridge = {
  send: (path: string, payload: unknown) => Promise<unknown>
}

/**
 * Errors that reach the renderer with their message. Every other failure crosses as `internal`.
 */
export function isExposedError(error: unknown) {
  return LocalFilesFault.is(error)
}
