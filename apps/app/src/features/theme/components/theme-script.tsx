import { ScriptOnce } from "@tanstack/react-router"

const themeScript = (() => {
  function themeFn() {
    const root = document.documentElement

    if (root.classList.contains("system")) {
      root.classList.remove("system")
      const isDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.add(isDark ? "dark" : "light", "system")
    }
  }
  return `(${themeFn.toString()})();`
})()

export default function ThemeScript() {
  return <ScriptOnce>{themeScript}</ScriptOnce>
}
