---
"@metaideas/create-v1": minor
---

Replace the `pnpm template` commands with the `v1-setup`, `v1-update`, `v1-workspace`, and `v1-feature` skills

Each skill in `.agents/skills/` bundles the script it runs. Run setup with `node .agents/skills/v1-setup/scripts/setup.ts`, compare with the template with `node .agents/skills/v1-update/scripts/upstream.ts diff`, record a new baseline with `upstream.ts stamp`, and restore a workspace with `node .agents/skills/v1-workspace/scripts/restore.ts <app|package> <name>`. Setup deletes the `v1-setup` skill when it finishes. `pnpm create @metaideas/v1` now stops after installing the dependencies and tells you to run the `v1-setup` skill in a coding agent, so it no longer takes setup options. `pnpm run scripts` is gone.
