import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useState } from "react"
import {
  getLocale,
  isLocale,
  type Locale,
  setLocale as setParaglideLocale,
} from "#shared/internationalization/runtime.js"
import { log } from "#shared/logger.ts"

const LOCALE_STORAGE_KEY = "v1-locale"

export function useHideSplashScreen() {
  useEffect(() => {
    async function hideSplash() {
      try {
        await SplashScreen.hideAsync()
      } catch (error) {
        log.warn({ error, message: "Error hiding splash screen" })
      }
    }

    void hideSplash()
  }, [])
}

export function useLogRenderError(error: unknown) {
  useEffect(() => {
    log.error({ error, message: "Route rendering failed" })
  }, [error])
}

export function usePersistedLocale() {
  const [locale, setLocale] = useState<Locale>(() => getLocale())

  useEffect(() => {
    async function hydrateLocale() {
      const storedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      if (!isLocale(storedLocale)) return

      void setParaglideLocale(storedLocale, { reload: false })
      setLocale(storedLocale)
    }

    void hydrateLocale()
  }, [])

  async function selectLocale(nextLocale: Locale) {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
    void setParaglideLocale(nextLocale, { reload: false })
    setLocale(nextLocale)
  }

  return { locale, selectLocale }
}
