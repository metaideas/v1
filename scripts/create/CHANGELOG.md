# @metaideas/create-v1

## 1.5.0

### Minor Changes

- 677f8b5: Add `database.withTransaction` to run composed database operations in one transaction

  `createDatabase` from `@v1/database/server` returns a `withTransaction(operation)` method. A call inside another call on the same database reuses its transaction, so operations that each open one still commit or roll back together. Concurrent calls each get their own transaction.

- 9f7b7c8: Build each server app's services in one object, and give packages explicit exports and `create*` factory names

  `apps/api` handlers read each service by name, such as `c.var.database`, tRPC procedures read `ctx.database`, and `apps/app` server functions read `context.database`. Each composition root exports `services` and a `close` function, and `@v1/database` closes its pool with `database.close()`. Server-only modules are named `server`, such as `@v1/database/server`, `@v1/payments/server`, and `@v1/workflows/server`, and every factory starts with `create`, such as `createTransport` and `createExpoClient`. Package exports list each subpath instead of a wildcard. `@v1/auth` builds the server and Convex auth from one `createAuthOptions` policy, and `pnpm run generate new-package` creates a package with the same shape as the existing ones.

- 4220be0: Remove `pnpm template doctor` and enforce its checks with lint, `turbo boundaries`, and tests

  Projects no longer get the doctor command or skill. `pnpm run boundaries` rejects a package workspace that depends on another capability package. The `v1/package-env` lint rule rejects package source that reads `ENV`, and `v1/core-services` rejects a `@v1/core/services/` folder named after a package. Root tests in `__tests__/` check `turbo.json` env lists and documentation links. To verify a project, run `pnpm run check`, `analyze`, `boundaries`, `env:check`, `build`, and `test`, or add your own verification skill.

- a6fa456: Replace the `pnpm template` commands with the `v1-setup`, `v1-update`, `v1-workspace`, and `v1-feature` skills

  Each skill in `.agents/skills/` bundles the script it runs. Run setup with `node .agents/skills/v1-setup/scripts/setup.ts`, compare with the template with `node .agents/skills/v1-update/scripts/upstream.ts diff`, record a new baseline with `upstream.ts stamp`, and restore a workspace with `node .agents/skills/v1-workspace/scripts/restore.ts <app|package> <name>`. Setup deletes the `v1-setup` skill when it finishes. `pnpm create @metaideas/v1` now stops after installing the dependencies and tells you to run the `v1-setup` skill in a coding agent, so it no longer takes setup options. Connect an app to a backend with `pnpm run generate connect-backend`, which writes the client files from templates in `turbo/generators/`. `pnpm run scripts` is gone.

- 4220be0: Declare each workspace's lint layers, feature roles, and Knip settings in its own `package.json`

  Each application workspace lists its route folder, entrypoint tiers, allowed feature roles, and handler shape in a `workspace` field in its `package.json`, and any workspace can add its Knip settings there. The `v1/*` lint rules, `knip.config.ts`, and `pnpm run generate new-feature` read that field, so removing a workspace's folder removes its settings. `v1/feature-files` now rejects a role that the app doesn't allow, such as `middleware.ts` in an `apps/web` feature.

### Patch Changes

- 2947970: Fix `pnpm run test` after applying the `bull-board`, `sentry`, or `posthog` recipe to `apps/api`. The recipe tests also pass in projects that omit `apps/api`.
- 41f7cd2: Point the canonical link and `og:url` of each `apps/web` page at the site set in `PUBLIC_SITE_URL`. Before this fix, every page pointed search engines at `https://v1.metaideas.io`.
- 4220be0: Fix projects from `pnpm template setup` failing `check` and `analyze` before any change

  Setup now sorts the dependency lists that the scope rename reorders, formats the project after Expo prebuild, and installs without a frozen lockfile so it also runs in CI. It fails when it leaves the template scope, a `TEMPLATE:START` marker, or the template README behind.

- 0550920: Offer updates for exact dependency pins when you run `pnpm -w run bump:deps`. Add `--filter <workspace>` after `bump:deps` to choose updates for one workspace.
