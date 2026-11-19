# Create a package workspace

A package workspace owns its constants, types, dependencies, and environment fragments. Scaffold it with the Turbo generator, then fill in the domain.

1. Check that no existing package owns the domain. `@<scope>/utils` is only for helpers several workspaces use and no package owns.
2. Scaffold:

   ```bash
   pnpm run generate new-package
   ```

   It asks for a name and a one-line description, and creates `packages/<name>` with the project scope, the shared tsconfig preset, the `#*` imports field, a `./server` subpath export, an `env/.env.server` fragment, and a `create<Name>` factory in `src/server.ts` that accepts an optional `logger`.

3. Add the third-party dependency behind the package with `pnpm add` inside the package. Grow the `create<Name>(options)` factory in `src/server.ts`, and add a subpath to `package.json` `exports` for each module that a consumer imports. Name a module `server.ts` when it holds a secret or a connection, `react.ts` for React bindings, and `client.ts` only for a browser client. The factory takes configuration and other services as options. The package never reads `ENV`, creates a client, or configures process-wide state at import time, and it depends only on `@<scope>/core`, `@<scope>/utils`, and `@<scope>/ui`. When it needs another capability, declare the smallest interface it needs, such as a callback, and let the application pass an implementation. Keep the optional `logger`, which satisfies `@<scope>/core/services/logging`, instead of choosing where logs go. Define the faults the package throws in `src/errors.ts` with a `<Name>Fault` registry, and export them at `./errors`. Do not add them to `@<scope>/core`.
4. If the package needs environment variables, declare them in `env/.env.server`, or add `env/.env.client`, `env/.env.build`, or `env/.env.shared`. Delete `env/.env.server` when the package reads none. Do not add a root `.env.schema`. Each consumer imports the fragment from its own `.env.schema` and passes the values to the factory.
5. Add the package as a `workspace:*` dependency of each consumer, build the service in the consumer's composition root (`#shared/services.ts`, or `#shared/server/services.ts` in a full-stack application), and pass it to handlers through the framework context. Run `pnpm install`, then `pnpm run check`, `pnpm run analyze`, and `pnpm run boundaries`. Finish when they pass.
