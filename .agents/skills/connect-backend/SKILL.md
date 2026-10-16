---
name: connect-backend
description: Connect an application workspace to a backend workspace. Use when the user wants apps/app, apps/desktop, apps/extension, or apps/mobile to talk to the Hono API (apps/api) through Hono RPC or tRPC, with or without sign-in, or to Convex (packages/backend).
---

Wire a client into the app by hand from the reference files in `references/`. Copy each file to its target path, then replace the placeholders with the `name` field of the matching manifest: `{{apiPackage}}` from `apps/api`, `{{backendPackage}}` from `packages/backend`, `{{authPackage}}` from `packages/auth`, `{{utilsPackage}}` from `packages/utils`, `{{uiPackage}}` from `packages/ui`.

Supported connections. Anything else is unsupported; say so instead of improvising.

| App         | Backend | Auth                                    |
| ----------- | ------- | --------------------------------------- |
| `app`       | hono    | optional, uses the existing auth client |
| `app`       | trpc    | optional, uses the existing auth client |
| `app`       | convex  | not supported                           |
| `desktop`   | hono    | optional                                |
| `desktop`   | trpc    | optional                                |
| `desktop`   | convex  | not supported                           |
| `extension` | hono    | optional, Chromium browsers only        |
| `extension` | trpc    | optional, Chromium browsers only        |
| `mobile`    | hono    | optional                                |
| `mobile`    | convex  | required                                |

Each app reaches the API in its own way, because each runs on an origin that cannot share the API's session cookie the way a web page can:

- `desktop` sends every API request through the main process, which keeps the session cookie encrypted with the operating system's keychain and streams each response back over IPC. The renderer never holds the session. Sign-in is email and password; social sign-in is not supported.
- `extension` calls the API with the session cookie, which Chrome sends to hosts the extension lists in `host_permissions`. A fixed manifest `key` gives the extension a stable `chrome-extension://` origin for the API to trust. Firefox gives each install a random origin, so sign-in does not work there.
- `mobile` keeps the session in SecureStore and sends it as a header.

## Steps

1. Confirm the backend workspace exists: `apps/api` for hono and trpc, `packages/backend` for convex. Restore a missing one with `bun template add`.
2. Add workspace dependencies to the app's `package.json` as `workspace:*`: the api package and the utils package for hono and trpc; the backend package for convex, plus the auth package on mobile; the auth package for desktop, extension, and mobile with auth.
3. Add environment keys to the app's `.env.schema` and a value to `.env.development`, creating that file when the app has none. `apps/app` already declares an optional `PUBLIC_API_URL`; set it in `.env.development` to select the remote API.

   | App                    | Key                           | Schema comment                                                  | Development value              |
   | ---------------------- | ----------------------------- | --------------------------------------------------------------- | ------------------------------ |
   | `desktop`, `extension` | `PUBLIC_API_URL`              | `# @public @required @type=url(matches=/^https?:\/\//)`         | `http://localhost:3000`        |
   | `extension` with auth  | `EXTENSION_KEY`               | `# @public`                                                     | generated in step 4            |
   | `mobile`               | `EXPO_PUBLIC_API_URL`         | `# @public @static @required @type=url(matches=/^https?:\/\//)` | `http://localhost:3000`        |
   | `mobile`               | `EXPO_PUBLIC_CONVEX_URL`      | `# @public @static @type=url`                                   | `https://example.convex.cloud` |
   | `mobile`               | `EXPO_PUBLIC_CONVEX_SITE_URL` | `# @public @static @type=url`                                   | `https://example.convex.site`  |
   | `app`, `desktop`       | `PUBLIC_CONVEX_URL`           | `# @public @required @type=url`                                 | `https://example.convex.cloud` |

   Put a one-line description above each key, as the file's other keys have. The API URL keys belong to hono and trpc, and the Convex keys belong to convex. `EXTENSION_KEY` changes the built manifest, so also add it to the `build` task's `env` in the root `turbo.json`, which keeps Turbo from reusing a build with another key.

4. Copy the client files for the connection into `src/`:
   - **hono**: `references/hono/api.ts.hbs` to `shared/api.ts`. Mobile with auth takes `references/hono/mobile/api.ts.hbs` instead, which sends the session headers. Desktop and extension take `references/hono/<app>/api.ts.hbs` instead. Desktop, extension, and mobile also take `references/hono/<app>/utils.ts.hbs` to `shared/utils.ts`.
   - **trpc**: `references/trpc/<app>/trpc.tsx.hbs` to `shared/trpc.tsx`. Desktop and extension also take `references/hono/<app>/utils.ts.hbs` to `shared/utils.ts`. Install the client libraries inside the app: `bun add --exact @trpc/client @trpc/tanstack-react-query superjson`. An app without `@tanstack/react-query`, such as extension, also adds it at the version the other workspaces pin, so the workspace keeps one version: `bun add --exact @tanstack/react-query@<version>`. The desktop and extension clients batch calls into one response; a call streams each result as it resolves when it passes `trpc: { context: { stream: true } }`.
   - **desktop API proxy** (hono or trpc): `references/shared/desktop/api-proxy.ts.hbs` to `shared/api-proxy.ts` and `shell-api-proxy.ts.hbs` to `shared/shell/api-proxy.ts`. Then edit the existing files:
     - `shared/bridge.ts`: export `const STREAM_CHANNEL_PREFIX = "stream:"` above the `Bridge` type, and add `listen: (channel: string, listener: (message: unknown) => void) => () => void` to the `Bridge` type.
     - `shell/preload.ts`: import `STREAM_CHANNEL_PREFIX` from `#shared/bridge.ts` and add `listen` to the bridge, before `send`:

       ```ts
       listen: (channel, listener) => {
         if (!channel.startsWith(STREAM_CHANNEL_PREFIX)) {
           throw new Error(`The renderer can only listen to ${STREAM_CHANNEL_PREFIX} channels`)
         }

         function handleMessage(_event: Electron.IpcRendererEvent, message: unknown) {
           listener(message)
         }

         ipcRenderer.on(channel, handleMessage)
         return () => {
           ipcRenderer.off(channel, handleMessage)
         }
       },
       ```

     - `shell/bridge.ts`: add the proxy to the routers, importing `createApiProxyRouter` from `#shared/shell/api-proxy.ts`: `mergeRouters(localFilesRouter, createApiProxyRouter())`.
     - `vite.main.config.ts`: add `plugins: [varlock()]`, importing `varlockVitePlugin as varlock` from `@varlock/vite-integration`, so the main process reads `ENV.PUBLIC_API_URL`.
   - **convex**: `references/convex/<app>/convex-provider.tsx.hbs` to `shared/components/convex-provider.tsx`.
     - `mobile` also takes `references/convex/mobile/auth.ts.hbs` to `shared/auth.ts`.
     - `app` also takes `references/convex/app/convex.ts.hbs` to `shared/convex.ts`.
   - **mobile auth** (convex, or hono with auth): `references/hono/mobile/auth.ts.hbs` to `shared/auth.ts` for hono, plus `references/shared/mobile-auth/_layout.tsx.hbs` to `app/(auth)/_layout.tsx`, `sign-in.tsx.hbs` to `app/(auth)/(unauthenticated)/sign-in.tsx` with `use-email-sign-in.ts.hbs` to `shared/use-email-sign-in.ts`, and `index.tsx.hbs` to `app/(auth)/(authenticated)/index.tsx`. Existing routes stay public; only screens moved under `(authenticated)` require a session.
   - **desktop auth**: copy from `references/shared/desktop-auth/`: `auth.ts.hbs` to `shared/auth.ts`, the bridge contract that the auth feature and other shared modules use; `shell-auth.ts.hbs` to `shared/shell/auth.ts`; `errors.ts.hbs`, `handlers.ts.hbs`, `data.ts.hbs`, and `hooks.ts.hbs` to `features/auth/`; `sign-in-form.tsx.hbs` and `account-panel.tsx.hbs` to `features/auth/components/`; and `account.tsx.hbs` to `renderer/routes/account.tsx`. Link to `/account` from `renderer/routes/index.tsx`. In `shell/bridge.ts`, add `authRouter` from `#features/auth/handlers.ts` and pass the session cookie to the proxy, importing `auth` from `#shared/shell/auth.ts`: `mergeRouters(localFilesRouter, authRouter, createApiProxyRouter(() => ({ cookie: auth.getCookie() })))`. `PROTOCOL` in `auth.ts` must equal `packagerConfig.appBundleId` in `forge.config.ts`. The app does not call Better Auth's `setupMain`, because email and password sign-in needs no deep link or browser window. In `apps/api`, add `electron({ cookiePrefix: AUTH_API_COOKIE_PREFIX })` from the auth package's `server` entry to the `plugins` of `createServerAuth` in `src/shared/services.ts`, and add `<PROTOCOL>:/`, such as `com.desktop.app:/`, to `ALLOWED_API_ORIGINS` in its `.env.development` and in each deployment.
   - **extension auth**: copy from `references/shared/extension-auth/`: `auth.ts.hbs` to `shared/auth.ts`; `schemas.ts.hbs` and `hooks.ts.hbs` to `features/auth/`; and `account-panel.tsx.hbs` to `features/auth/components/account-panel.tsx`. Render `AccountPanel` on its own route in `entrypoints/popup/main.tsx`, such as `<Route component={AccountPanel} path="/account" />`, and link to it from the popup, as `features/demo/components/popup-demo.tsx` links to `/settings`. Generate the extension's key and its origin:

     ```bash
     bun --eval 'const { createHash, generateKeyPairSync } = await import("node:crypto"); const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { format: "pem", type: "pkcs8" }, publicKeyEncoding: { format: "der", type: "spki" } }); const id = createHash("sha256").update(publicKey).digest("hex").slice(0, 32).replace(/./g, (digit) => String.fromCharCode(97 + Number.parseInt(digit, 16))); console.log(`EXTENSION_KEY=${publicKey.toString("base64")}\nchrome-extension://${id}`)'
     ```

     Set `EXTENSION_KEY` in the extension's `.env.development`. For a published extension, use the public key from the Chrome Web Store instead, so the development and published IDs match. In `wxt.config.ts`, add the manifest:

     ```ts
     manifest: {
       // Lets the extension call the API and send its session cookie.
       host_permissions: [`${new URL(ENV.PUBLIC_API_URL).origin}/*`],
       // Fixes the extension's ID, and with it the origin the API trusts.
       key: ENV.EXTENSION_KEY,
     },
     ```

     In `apps/api`, add the printed `chrome-extension://` origin to `ALLOWED_API_ORIGINS` in its `.env.development` and in each deployment.

5. Wrap the provider tree in `src/shared/components/providers.tsx`. Edit the JSX, matching the file as it is now:
   - **trpc** in `desktop`: import `TRPCProvider` from `#shared/trpc.tsx` and place it inside `QueryClientProvider`, wrapping its children.
   - **trpc** in `extension`: the extension has no provider tree, and `TRPCProvider` from `#shared/trpc.tsx` brings its own query client. Wrap the popup's `Router` in `entrypoints/popup/main.tsx` with it.
   - **trpc** in `app`: the query client is created per request in `src/router.tsx`, so connect there instead of in `providers.tsx`. After the `QueryClient` is created, add `const trpcClient = makeTRPCClient()`, importing `makeTRPCClient` and `TRPCProvider` from `#shared/trpc.tsx`, and add `Wrap: ({ children }) => <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>{children}</TRPCProvider>` to the `createRouter` options. With convex too, nest both providers in the one `Wrap`.
   - **convex** in `mobile` and `desktop`: import `ConvexProvider` from `#shared/components/convex-provider.tsx` and wrap the query client provider with it (`PersistQueryClientProvider` on mobile, `QueryClientProvider` on desktop).
   - **convex** in `app`: the query client is created per request in `src/router.tsx`, so connect there instead of in `providers.tsx`. After the `QueryClient` is created, call `createConvexClient(queryClient)` from `#shared/convex.ts` and add `Wrap: ({ children }) => <ConvexProvider client={convex}>{children}</ConvexProvider>` to the `createRouter` options.
   - **hono** needs no provider.
6. If the user wants an example, copy `references/<backend>/<app>/example.tsx.hbs` into the routes directory as `backend-example.tsx` (`trpc-example.tsx` for trpc, `convex-example.tsx` for convex): `src/routes/` in app, `src/renderer/routes/` in desktop, and `src/app/` in mobile (`src/app/(auth)/(authenticated)/` when auth is on). After adding a route in app or desktop, including the desktop account route, regenerate the committed route tree by loading the Vite config that declares the router plugin:

   ```bash
   cd apps/app && CI=1 bun --eval 'import { resolveConfig } from "vite"; await resolveConfig({}, "build")'
   cd apps/desktop && CI=1 bun --eval 'import { resolveConfig } from "vite"; await resolveConfig({ configFile: "vite.renderer.config.ts" }, "build")'
   ```

7. Run `bun install`, `bun run codegen`, then `bun template doctor`. Fix what it reports. Finish when it passes.

Convex in `app` and `desktop` reaches public functions only. `apps/app` keeps its own Better Auth sessions; moving them to Convex means migrating the `/api/auth` handler, server-side token handoff, and the sign-up, reset, and social flows together, which is outside this skill.

For `apps/app`, keeping `PUBLIC_API_URL` set selects the remote Hono deployment and clearing it restores the local `/api` handler. When both run, keep the Better Auth cookie, secret, plugins, and trusted origins compatible. When the app and the API use different hostnames, set `AUTH_COOKIE_DOMAIN` in `apps/api` to their shared parent domain, such as `example.com`. Without it, the API's session cookie is host-only, so either the app's server or the browser's direct API calls miss the session.
