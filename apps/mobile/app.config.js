const APP_ID = "v1"
const APP_NAME = "v1"
const APP_OWNER = "metaideas"
// Android package names cannot contain dashes.
const APP_BUNDLE_IDENTIFIER = `app.${APP_OWNER}.${APP_ID.replaceAll("-", "")}`
const VERSION = "1.0.0"

const expoConfig = {
  android: {
    adaptiveIcon: {
      backgroundColor: "#e6f4fe",
      backgroundImage: "./src/shared/assets/images/android-icon-background.png",
      foregroundImage: "./src/shared/assets/images/android-icon-foreground.png",
      monochromeImage: "./src/shared/assets/images/android-icon-monochrome.png",
    },
    package: APP_BUNDLE_IDENTIFIER,
    predictiveBackGestureEnabled: false,
  },
  experiments: {
    reactCompiler: true,
    typedRoutes: true,
  },
  icon: "./src/shared/assets/images/icon.png",
  ios: {
    bundleIdentifier: APP_BUNDLE_IDENTIFIER,
    supportsTablet: true,
  },
  name: APP_NAME,
  newArchEnabled: true,
  orientation: "portrait",
  owner: APP_OWNER,
  plugins: [
    "expo-font",
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
        image: "./src/shared/assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
      },
    ],
    ["expo-dev-client", { launchMode: "most-recent" }],
  ],
  scheme: APP_ID,
  slug: APP_ID,
  updates: {
    enabled: false,
  },
  userInterfaceStyle: "automatic",
  version: VERSION,
  web: {
    favicon: "./src/shared/assets/images/favicon.png",
    output: "static",
  },
}

/**
 * @param {import("expo/config").ConfigContext} context
 *
 * @returns {import("expo/config").ExpoConfig} Expo configuration.
 */
export default function configureExpo({ config }) {
  return {
    ...config,
    ...expoConfig,
  }
}
