export const THEMES = ["light", "dark", "system"] as const

export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = "v1-theme"
export const MOBILE_BREAKPOINT = 768
