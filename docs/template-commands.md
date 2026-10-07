---
title: Template Commands
description: Configure, verify, extend, and update scaffolded projects from v1 with local template commands.
---

Use these template commands to configure and extend projects created with `bun create metaideas/v1 <name>`. Each command does one mechanical job. The skills in `.agents/skills/` drive them and finish with `bun template doctor`.

## Commands

### `bun template setup`

Configure a newly created project. This command does the following:

- It prompts you to select the application and package workspaces to keep, and keeps the packages they depend on.
- It sets the project name, which is also the package scope, and rewrites `@v1/` references.
- It sets the Expo app ID and name in `apps/mobile/app.config.js` to the project name. On macOS, it regenerates the native iOS and Android projects with `expo prebuild`. On other systems, run `bun run --filter mobile prebuild` on a Mac afterward.
- It records the source template, commit, and creation time in `.template.json`.
- It replaces the template `README.md` with one that lists the project name, its description, the kept workspaces, and the docs.
- It removes content that only template maintainers use, including the marked template sections of `AGENTS.md`.

```bash
bun template setup
bun template setup --yes --name <name> --description "<sentence>" --keep-apps app,api --keep-packages auth,database
```

### `bun template doctor`

Verify the project. The doctor checks the template invariants, then runs the existing tools:

- No `@v1/` references remain after the rename.
- Every scoped dependency resolves to a workspace, and no package workspace depends on an application workspace.
- Every `@import` in an environment contract points at an existing fragment, and every `@generateTsTypes` output exists.
- Every pattern in the `build` task `env` list of `turbo.json` matches a declared key.
- Template-only content matches the project state: markers and `v1` fields are gone from a scaffolded project, and present in the template.
- `README.md` in a scaffolded project is no longer the template README.
- Every backend client file in an app has its backend workspace and dependency.
- `bun run check`, `bun run boundaries`, `bun run analyze`, `bun run env:check`, and `bun run build` pass.

```bash
bun template doctor
bun template doctor --fast # skip the build
```

### `bun template add <kind> <name>`

Copy an application or package workspace from the template at the commit recorded in `.template.json`, apply the package scope, and copy template packages it depends on. The command fetches the template into a `template` git remote, so the project must be a git repository.

```bash
bun template add app web
bun template add package auth
```

### `bun template remove <kind> <name>`

Delete a workspace and list the workspaces and files that still reference it.

```bash
bun template remove app docs
bun template remove package payments
```

### `bun template diff`

Fetch the upstream template and print the changes since the recorded commit, with `@v1/` rewritten to the project scope so hunks apply locally.

```bash
bun template diff --name-only
bun template diff
bun template diff --update-stamp
```

`--update-stamp` records the fetched commit in `.template.json` after you apply the changes you want.

## Project scripts

`bun run scripts` is the extensible entry point for scripts that the project owns.

## Updating your project

`bun template setup` creates `.template.json`:

```json
{ "template": "metaideas/v1", "commit": "<sha>", "createdAt": "<ISO date>" }
```

There is no automated merge. Run `bun template diff`, apply the relevant hunks, including upstream deletions, then record the new baseline with `--update-stamp` and run `bun template doctor`. The `update-from-template` skill walks a coding agent through this.
