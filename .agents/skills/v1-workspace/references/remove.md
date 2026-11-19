# Remove a workspace

Nothing outside a workspace lists it, so removing one means deleting its folder and the lines that use it in each composition root. Lint, typecheck, and `pnpm install` report anything you miss.

1. Find what depends on the workspace before you delete it:

   ```bash
   git grep -n "<scope>/<name>\|apps/<name>\|packages/<name>"
   ```

2. Delete the folder, such as `apps/<name>` or `packages/<name>`.
3. For each dependent workspace, delete the dependency from its `package.json` and every import of it. For each `.env.schema` that imported a fragment from the removed package, delete the `@import` line and the code that read those keys. Delete doc pages that describe only the removed surface.
4. Remove Docker services in `infra/local` that only the removed workspace used.
5. Run `pnpm install`, then `pnpm run check`, `pnpm run analyze`, and `pnpm run boundaries`, and fix what they report. Finish when they pass.
