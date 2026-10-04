export type LocalTextFile = {
  contents: string
  path: string
}

export type DesktopBridge = {
  openTextFile: () => Promise<LocalTextFile | null>
  saveTextFile: (file: LocalTextFile) => Promise<void>
}

declare global {
  // Only `var` attaches the property to the `globalThis` type.
  var desktop: DesktopBridge
}

export const IPC_CHANNELS = {
  openTextFile: "local-files:open",
  saveTextFile: "local-files:save",
} as const
