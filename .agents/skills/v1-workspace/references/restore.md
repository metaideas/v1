# Restore a workspace from the template

`scripts/restore.ts` copies the workspace from the template at the commit recorded in `.template.json`, renames its scope, and pulls in template packages it depends on. You wire it into the project. Run it from the project root.

1. Copy the workspace:

   ```bash
   node .agents/skills/v1-workspace/scripts/restore.ts app <name>      # apps/<name>
   node .agents/skills/v1-workspace/scripts/restore.ts package <name>  # packages/<name>
   ```

2. Run `pnpm install`.
3. Connect it. A package needs a consumer: add it as a `workspace:*` dependency where it is used and import its `.env` fragment from that app's `.env.schema`. An app needs its `.env.development` values and, when it talks to a backend, the `backend` reference of the `v1-feature` skill.
4. If the template has moved on since the stamp, `node .agents/skills/v1-update/scripts/upstream.ts diff --name-only` shows which upstream files changed. Only apply changes inside the workspace you just added.
5. Run `pnpm run codegen`, then `pnpm run check`, `pnpm run analyze`, and `pnpm run boundaries`, and fix what they report. Finish when they pass.
