---
name: remove-workspace
description: Delete an application or package workspace from a scaffolded project and clean up everything that referenced it. Use when the user drops a surface or dependency such as mobile, docs, payments, or email.
---

`pnpm template remove` deletes the directory and lists what still points at it. You finish the removal.

1. Remove the workspace:

   ```bash
   pnpm template remove app <name>
   pnpm template remove package <name>
   ```

2. Work through the printed lists. For each dependent workspace, delete the dependency from its `package.json` and every import of it. For each `.env.schema` that imported a fragment from the removed package, delete the `@import` line and the code that read those keys. Delete doc pages that describe only the removed surface.
3. Remove `build` env patterns in `turbo.json` that only the removed workspace declared, and Docker services in `infra/local` that only it used.
4. Run `pnpm install`, then `pnpm template doctor`, and fix what it reports. Finish when it passes.
