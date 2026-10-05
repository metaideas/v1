import { defineConfig } from "vite"

// The package is `"type": "module"`, so the main bundle must be ES modules for
// Electron to load the `.js` file. Setting `build.lib` also stops the Forge
// Vite plugin from applying its CommonJS default.
//
// Bundled CommonJS dependencies, such as `electron-squirrel-startup`, still
// call `require`. The Node platform makes Rolldown back it with
// `createRequire(import.meta.url)`; the default browser platform emits a stub
// that throws when the main process loads.
export default defineConfig({
  build: {
    lib: {
      entry: "src/shell/main.ts",
      fileName: () => "[name].js",
      formats: ["es"],
    },
    rolldownOptions: { platform: "node" },
  },
})
