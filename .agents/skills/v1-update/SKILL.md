---
name: v1-update
description: Pull improvements from the upstream v1 template into a scaffolded project. Use when the user asks to update, sync, or upgrade the template, or to see what changed upstream.
---

`.template.json` records the template commit this project was created from. `scripts/upstream.ts diff` fetches upstream and prints what changed since then, with the template scope already rewritten to this project's scope so hunks apply locally. Run the script from the project root.

1. Survey:

   ```bash
   node .agents/skills/v1-update/scripts/upstream.ts diff --name-only
   ```

   Drop files under workspaces this project removed. Group the rest by workspace.

2. Read the patch for the remaining files with `node .agents/skills/v1-update/scripts/upstream.ts diff`. For each hunk decide: apply as is, adapt because the project changed the same code, or skip because it does not fit the product. Apply upstream deletions too.
3. When the diff touches a `package.json`, run `pnpm install`. When it touches an `.env.schema` or a package `env/` fragment, run `pnpm run codegen`.
4. Record the new baseline so the next run starts from here:

   ```bash
   node .agents/skills/v1-update/scripts/upstream.ts stamp
   ```

5. Run `pnpm run check`, `pnpm run analyze`, and `pnpm run boundaries`, and fix what they report. Finish when they pass and report what was applied, adapted, and skipped.
