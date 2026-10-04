import { useEffect, useState } from "react"

import { THEMES, type Theme } from "#constants.ts"

type ThemeStateOptions = {
  theme?: Theme
  setTheme?: (theme: Theme) => void
  defaultTheme: Theme
  storageKey?: string
}

function isTheme(value: string): value is Theme {
  return THEMES.some((theme) => theme === value)
}

export function useThemeState({ theme, setTheme, defaultTheme, storageKey }: ThemeStateOptions) {
  const [userTheme, setUserTheme] = useState(() => {
    if (theme !== undefined) {
      return theme
    }

    if (storageKey && typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(storageKey)
      if (stored && isTheme(stored)) {
        return stored
      }
    }

    return defaultTheme
  })

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)")

    function updateTheme() {
      root.classList.remove("light", "dark", "system")

      if (userTheme === "system") {
        const systemTheme = mediaQuery.matches ? "dark" : "light"
        root.classList.add(systemTheme)
      } else {
        root.classList.add(userTheme)
      }
    }

    mediaQuery.addEventListener("change", updateTheme)
    updateTheme()

    return () => {
      mediaQuery.removeEventListener("change", updateTheme)
    }
  }, [userTheme])

  return {
    setTheme(newTheme: Theme) {
      setUserTheme(newTheme)

      if (setTheme) {
        setTheme(newTheme)
        return
      }

      if (storageKey) {
        localStorage.setItem(storageKey, newTheme)
      }
    },
    theme: userTheme,
  }
}
