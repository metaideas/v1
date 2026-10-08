# Coding Standards

Follow the TypeScript, service, import, UI, component, test, comment, and commit conventions that every v1 workspace shares.

## TypeScript Style

- Write concise, technical TypeScript.
- Use functional and declarative patterns.
- Avoid enums.
- Use `readonly` arrays or maps with `as const`.
- Rely on type inference. Annotate function parameters, exported contracts, and values that TypeScript cannot infer, such as an empty array. Do not annotate local variables, return types, or callback parameters that TypeScript already infers.
- Use the `function` keyword for pure functions.
- Use descriptive names without restating the context. Prefer `handlePress` to `press` or `handleComposeButtonPress`.
- Name event handlers `handle` followed by the event, such as `handlePress` or `handleRefresh`.
- Use auxiliary verbs for state and behavior, such as `isRefreshing`, `hasError`, or `canSubmit`.
- Name runtime validation schema constants in PascalCase, such as `UserIdSchema`. Put them in a `schemas.ts` file.
- Use lowercase kebab-case names for directories.
- Use a default export for a component.
- Do not use a default export when a module exports multiple functions.
- Order a module so that each part comes before the code that uses it: types, static content, helpers, subcomponents, and the exported component last.
- Extract a component, helper, or constant when a second caller needs it or when it names a distinct part of the UI. Do not add props, options, or variants that no caller uses.
- When the order of object keys matters, such as when a library infers a type from an earlier key, do not disable `sort-keys`. Put the keys that must come later in their own group after a blank line, and add a comment above the group that explains the order. `sort-keys` sorts each group separately.

## Services

- A package workspace exports `create*` factories. It never creates a client, reads `ENV`, or configures process-wide state when it is imported.
- A factory takes configuration and other services as options. A package workspace exports Varlock fragments under `env/` (`.env.server`, `.env.client`, `.env.build`, `.env.shared`). Application workspaces own the `.env.schema` that composes those fragments with their own keys, read `ENV`, and pass the values to factories.
- A package workspace does not import another capability package. It declares the smallest interface it needs, such as a callback, and the application passes an implementation. A contract that several packages share lives in `@v1/core/services/<service>/`.
- A package accepts an optional `logger` that satisfies `@v1/core/services/logging`. The application decides where logs go.
- Each application builds its services once in its composition root: `#shared/services.ts`, or `#shared/server/services.ts` for server-only services in a full-stack application. Code deeper in the application receives those instances and never calls a factory itself.
- Pass services through the framework context: `c.var` in Hono, request middleware context in TanStack Start, and `ctx` in Convex. Import the composition root directly only where no framework context exists, such as a workflow definition or a script.
- A service that holds connections exposes a way to close them, and the application closes it on shutdown. A long-running server process, such as `apps/api` or `apps/worker`, starts with `lifecycle` from `@v1/utils/lifecycle`, which runs the startup function and closes its services in `close` on a signal, an uncaught exception, or a failed startup, within a deadline.

## Imports and Boundaries

- Do not import between apps. An app that serves other apps exposes one client entry point, and other apps import only that.
- Import validation from `@v1/utils/schema/mini` in browser-reachable code and from `@v1/utils/schema` when the full Zod API or a full-Zod integration is required. The Mini entry point never imports the full one.

## UI

- Use `@v1/ui` for the web UI. Import one component per subpath, for example `@v1/ui/components/button`.
- In `apps/mobile`, use the universal Expo UI components from `@expo/ui` for native controls and Uniwind `className` styles for React Native views.
- Use `cn` from the `cn` package to compose class names.
- Keep the web UI responsive, accessible, and compatible with dark mode.
- Compose the web UI from the existing Radix and Tailwind foundations.

## Components

- Write JSX in the order that the UI renders, so the markup reads like the screen from top to bottom.
- Keep state minimal. Store only values that the user or an external source changes, and derive everything else during render. Do not copy one value into another piece of state.

## Tests

- Use Bun to manage packages and execute scripts.
- Use `bun:test`. Import `describe`, `expect`, and `test` from it.
- Add tests to a `__tests__` folder beside the file they test.
- Name each `describe` block after its function. Name each test case after its behavior.
- Use `bun run build --filter=<workspace>` for builds of a target workspace.

## Comments

- Prefer clear names and structure to explanatory comments.
- Do not add comments that repeat the code, describe an obvious operation, or describe a change from an earlier implementation.
- Delete all commented-out code.

## READMEs

- A workspace README is a heading and a one-line description. Do not add usage, setup, or structure notes. Put documentation in root `docs/` instead.

## Commits

- Use a conventional commit message (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`, `build:`, `ci:`, `revert:`, `release:`, `deps:`, `wip:`, `breaking:`, `deprecate:`).
- Give pull requests a conventional commit title. Squash merges use it as the commit message.

## Workspace Conventions

- `apps/api`: use Hono middleware for authentication and logging, modular route handlers, `app.onError` for global errors, and Hono response helpers. Routes can import other routes to compose the router.
- `apps/mobile`: use functional React components, Expo APIs, Expo Router for navigation, Expo for assets, and Reanimated for performance-sensitive animation.
- `apps/docs`: a standalone Starlight example. Put pages in `src/content/docs/` with `title` and `description` frontmatter. It does not publish the root `docs/` folder, which documents the template.
- `packages/core`: put business rules in `src/domains/<domain>/` and contracts for external capabilities, such as email delivery, in `src/services/<service>/`. Code that both use goes in `src/shared/`. Do not organize it by product feature.
- `packages/database`: use Drizzle, the shared prefixed-ID helper, and timestamps where appropriate.
- `packages/backend`: keep Convex functions in `public/`, `system/`, and `shared/`. Do not edit `_generated/`.
- `packages/ui`: components are copy-owned source from the shadcn registry, and oxlint checks them like any other code. After `components:add`, run `bun run fix` and resolve what `bun run check` still reports.
