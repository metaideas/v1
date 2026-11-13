---
title: Template Commands
description: Configure, verify, extend, and update scaffolded projects from v1 with local template commands.
---

Use these template commands to configure and extend projects created with `bun create metaideas/v1 <name>`. Each command does one mechanical job. The skills in `.agents/skills/` drive them and finish with `pnpm template doctor`.

## Commands

### `pnpm template setup`

Configure a newly created project. This command does the following:

- It prompts you to select the application and package workspaces to keep, and keeps the packages they depend on.
- It sets the project name, which is also the package scope, and rewrites `@v1/` references.
- It sets the Expo app ID and name in `apps/mobile/app.config.js` to the project name. On macOS, it regenerates the native iOS and Android projects with `expo prebuild`. On other systems, run `pnpm --filter mobile run prebuild` on a Mac afterward.
- It records the source template, commit, and creation time in `.template.json`.
- It replaces the template `README.md` with one that lists the project name, its description, the kept workspaces, and the docs.
- It removes content that only template maintainers use, including the marked template sections of `AGENTS.md`.

```bash
pnpm template setup
pnpm template setup --yes --name <name> --description "<sentence>" --keep-apps app,api --keep-packages auth,database
```

### `pnpm template doctor`

Verify the project. The doctor checks the template invariants, then runs the existing tools:

- No `@v1/` references remain after the rename.
- Every scoped dependency resolves to a workspace, and no package workspace depends on an application workspace.
- Every `@import` in an environment contract points at an existing fragment, and every `@generateTsTypes` output exists.
- Every pattern in the `build` task `env` list of `turbo.json` matches a declared key.
- Template-only content matches the project state: markers and `v1` fields are gone from a scaffolded project, and present in the template.
- `README.md` in a scaffolded project is no longer the template README.
- Every backend client file in an app has its backend workspace and dependency.
- `pnpm run check`, `pnpm run boundaries`, `pnpm run analyze`, `pnpm run env:check`, and `pnpm run build` pass.

```bash
pnpm template doctor
pnpm template doctor --fast # skip the build
```

### `pnpm template add <kind> <name>`

Copy an application or package workspace from the template at the commit recorded in `.template.json`, apply the package scope, and copy template packages it depends on. The command fetches the template into a `template` git remote, so the project must be a git repository.

```bash
pnpm template add app web
pnpm template add package auth
```

### `pnpm template remove <kind> <name>`

Delete a workspace and list the workspaces and files that still reference it.

```bash
pnpm template remove app docs
pnpm template remove package payments
```

### `pnpm template diff`

Fetch the upstream template and print the changes since the recorded commit, with `@v1/` rewritten to the project scope so hunks apply locally.

```bash
pnpm template diff --name-only
pnpm template diff
pnpm template diff --update-stamp
```

`--update-stamp` records the fetched commit in `.template.json` after you apply the changes you want.

## Project scripts

`pnpm run scripts` is the extensible entry point for scripts that the project owns.

## Updating your project

`pnpm template setup` creates `.template.json`:

```json
{ "template": "metaideas/v1", "commit": "<sha>", "createdAt": "<ISO date>" }
```

There is no automated merge. Run `pnpm template diff`, apply the relevant hunks, including upstream deletions, then record the new baseline with `--update-stamp` and run `pnpm template doctor`. The `update-from-template` skill walks a coding agent through this.
