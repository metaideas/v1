---
name: new-package
description: Create a package workspace under packages/ that owns one domain. Use when the user asks for a new shared package, a new integration package, or code that several application workspaces will share.
---

A package workspace owns its constants, types, dependencies, and environment fragments. Scaffold it with the Turbo generator, then fill in the domain.

1. Check that no existing package owns the domain. `@<scope>/utils` is only for helpers several workspaces use and no package owns.
2. Scaffold:

   ```bash
   pnpm run generate new-package
   ```

   It creates `packages/<name>` with the project scope, the shared tsconfig preset, and the `#*` imports field.

3. Add the third-party dependency behind the package with `pnpm add` inside the package. Export a `create<Name>(options)` factory from `src/index.ts`, and subpaths in `package.json` `exports`. The factory takes configuration and other services as options. The package never reads `ENV`, creates a client, or configures process-wide state at import time, and it depends only on `@<scope>/core`, `@<scope>/utils`, and `@<scope>/ui`. When it needs another capability, declare the smallest interface it needs, such as a callback, and let the application pass an implementation. Accept an optional `logger` that satisfies `@<scope>/core/services/logging` instead of choosing where logs go. Define the faults the package throws in `src/errors.ts` with a `<Name>Fault` registry, and export them at `./errors`. Do not add them to `@<scope>/core`.
4. If the package needs environment variables, declare them in `env/.env.server`, `env/.env.client`, `env/.env.build`, or `env/.env.shared`. Do not add a root `.env.schema`. Each consumer imports the fragment from its own `.env.schema` and passes the values to the factory.
5. Add the package as a `workspace:*` dependency of each consumer, build the service in the consumer's composition root (`#shared/services.ts`, or `#shared/server/services.ts` in a full-stack application), and pass it to handlers through the framework context. Run `pnpm install`, then `pnpm template doctor`. Finish when it passes.
