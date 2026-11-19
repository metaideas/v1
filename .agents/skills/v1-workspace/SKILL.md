---
name: v1-workspace
description: Add, restore, or remove a workspace in a project scaffolded from v1. Use when the user wants a new package workspace, a workspace that setup removed, such as mobile, api, payments, or email, or to drop a surface or dependency.
---

A workspace is an application workspace in `apps/` or a package workspace in `packages/`. Each workspace declares its own lint, Knip, and generator settings in the `workspace` field of its `package.json`, so the only other places that name it are the composition roots and `.env.schema` files that use it.

Pick the reference that matches the request and follow it:

- `references/restore.md`: bring back a workspace from the template, such as `apps/mobile` or `packages/payments`. `scripts/restore.ts` copies it at the commit in `.template.json`.
- `references/package.md`: create a new package workspace that owns one domain.
- `references/remove.md`: delete a workspace and everything that referenced it.

`scripts/restore.ts` imports the template helpers from the `v1-update` skill, so keep both skills.
