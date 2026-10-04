import type { PropsWithChildren } from "react"
import {
  DarkTheme,
  DefaultTheme,
  type Theme,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router"
import { type ColorValue, StatusBar } from "react-native"
import { useCSSVariable, useUniwind } from "uniwind"

function toColor(value: string | number | undefined, fallback: ColorValue) {
  return typeof value === "string" ? value : fallback
}

function useNavigationTheme(baseTheme: Theme): Theme {
  const [background, card, foreground, border, primary, destructive] = useCSSVariable([
    "--color-background",
    "--color-card",
    "--color-foreground",
    "--color-border",
    "--color-primary",
    "--color-destructive",
  ])

  return {
    ...baseTheme,
    colors: {
      background: toColor(background, baseTheme.colors.background),
      border: toColor(border, baseTheme.colors.border),
      card: toColor(card, baseTheme.colors.card),
      notification: toColor(destructive, baseTheme.colors.notification),
      primary: toColor(primary, baseTheme.colors.primary),
      text: toColor(foreground, baseTheme.colors.text),
    },
  }
}

export default function ThemeProvider({ children }: PropsWithChildren) {
  const { theme } = useUniwind()
  const isDark = theme === "dark"
  const navigationTheme = useNavigationTheme(isDark ? DarkTheme : DefaultTheme)

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {children}
    </NavigationThemeProvider>
  )
}
