import { electronClient as baseElectronClient } from "@better-auth/electron/client"
import { storage } from "@better-auth/electron/storage"
import { AUTH_COOKIE_PREFIX } from "#constants.ts"

/**
 * Keeps the session in the Electron main process. The client encrypts the session cookie with the
 * operating system's keychain, stores it in the app's user data, and sends it with every request
 * from the main process, so the renderer never sees it.
 */
export function electronClient(
  opts: Omit<Parameters<typeof baseElectronClient>[0], "storage"> & { cookiePrefix: string }
) {
  return baseElectronClient({
    channelPrefix: AUTH_COOKIE_PREFIX,
    storage: storage(),
    storagePrefix: AUTH_COOKIE_PREFIX,
    ...opts,
  })
}
