module.exports = (api) => {
  // oxlint-disable-next-line no-unsafe-call -- Babel passes this JavaScript config an untyped API
  api.cache(true)

  return {
    plugins: [require("@varlock/expo-integration/babel-plugin")],
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
  }
}
