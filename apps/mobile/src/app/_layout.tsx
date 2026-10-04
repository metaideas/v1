import { Button, Host } from "@expo/ui"
import { type ErrorBoundaryProps, Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { Text, View } from "react-native"
import Providers from "#shared/components/providers.tsx"
import { useHideSplashScreen, useLogRenderError } from "#shared/hooks.ts"

import "#shared/styles/globals.css"

void SplashScreen.preventAutoHideAsync()

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useLogRenderError(error)

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-6">
      <View className="items-center gap-2">
        <Text className="text-center text-2xl font-semibold text-foreground">
          Something went wrong
        </Text>
        <Text className="text-center text-base text-muted-foreground">
          The screen could not be loaded. Try rendering it again.
        </Text>
      </View>
      <Host matchContents>
        <Button
          label="Try again"
          onPress={() => {
            void retry()
          }}
        />
      </Host>
    </View>
  )
}

export default function RootLayout() {
  useHideSplashScreen()

  return (
    <Providers>
      <Stack />
    </Providers>
  )
}
