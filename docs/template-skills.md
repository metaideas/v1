---
title: Template Skills
description: Configure, extend, and update scaffolded projects from v1 with the v1 skills in .agents/skills/.
---

Use the `v1-` skills in `.agents/skills/` to configure and extend projects created from the `metaideas/v1` template. A coding agent follows a skill's instructions, and the skill bundles a script for each step that must come out the same every time. Run every script from the project root.

The template ships no verification command. Lint, `pnpm run boundaries`, typecheck, tests, and CI enforce its structure, and a scaffolded project can add its own verification skill.

## Skills

### `v1-setup`

Configure a newly created project. `scripts/setup.ts` does the following:

- It prompts you to select the application and package workspaces to keep, and keeps the packages they depend on.
- It sets the project name, which is also the package scope, and rewrites `@v1/` references.
- It sets the Expo app ID and name in `apps/mobile/app.config.js` to the project name. On macOS, it regenerates the native iOS and Android projects with `expo prebuild`. On other systems, run `pnpm --filter mobile run prebuild` on a Mac afterward.
- It records the source template, commit, and creation time in `.template.json` when the file doesn't exist. `pnpm create @metaideas/v1` writes the file with the commit it downloaded, so setup keeps it. A project created another way, such as with `gh repo create`, records the head of the template's `main` branch.
- It replaces the template `README.md` with one that lists the project name, its description, the kept workspaces, and the docs.
- It removes content that only template maintainers use, including the marked template sections of `AGENTS.md` and the `v1-setup` skill itself.
- It formats the project and fails if it leaves template content behind.

```bash
node .agents/skills/v1-setup/scripts/setup.ts
node .agents/skills/v1-setup/scripts/setup.ts --yes --name <name> --description "<sentence>" --keep-apps app,api --keep-packages auth,database
```

### `v1-workspace`

Add, restore, or remove a workspace. Each workspace declares its own lint, Knip, and generator settings in its `package.json`, so removing one means deleting its folder and its lines in each composition root.

To restore a workspace that setup removed, `scripts/restore.ts` copies it from the template at the commit recorded in `.template.json`, applies the package scope, and copies template packages it depends on. It fetches the template into a `template` git remote, so the project must be a git repository.

```bash
node .agents/skills/v1-workspace/scripts/restore.ts app web
node .agents/skills/v1-workspace/scripts/restore.ts package auth
```

To create a new package workspace, the skill runs `pnpm run generate new-package`.

### `v1-feature`

Create a feature folder with `pnpm run generate new-feature`, or connect an application workspace to `apps/api` or `packages/backend` from the reference sources in `references/backend/`.

### `v1-update`

Fetch the upstream template and print the changes since the recorded commit, with `@v1/` rewritten to the project scope so hunks apply locally.

```bash
node .agents/skills/v1-update/scripts/upstream.ts diff --name-only
node .agents/skills/v1-update/scripts/upstream.ts diff
node .agents/skills/v1-update/scripts/upstream.ts stamp
```

`stamp` records the fetched commit in `.template.json` after you apply the changes you want. `v1-setup` and `v1-workspace` import the template helpers in `v1-update/scripts/`, so keep `v1-update` in the project.

## Updating your project

`pnpm create @metaideas/v1` or `v1-setup` creates `.template.json`:

```json
{ "template": "metaideas/v1", "commit": "<sha>", "createdAt": "<ISO date>" }
```

There is no automated merge. Run `upstream.ts diff`, apply the relevant hunks, including upstream deletions, then record the new baseline with `upstream.ts stamp`, and run `pnpm run check` and `pnpm run analyze`. The `v1-update` skill walks a coding agent through this.
