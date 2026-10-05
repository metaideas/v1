import type { WebContents } from "electron"
import { implement } from "typedport"
import { desktopContract } from "#shared/bridge/contract.ts"

export type ShellContext = {
  sender: WebContents
}

export const handle = implement(desktopContract).$context<ShellContext>()
