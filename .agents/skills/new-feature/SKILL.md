---
name: new-feature
description: Create a feature folder inside an application workspace. Use when the user asks for a new feature, screen, flow, or vertical slice in apps/app, apps/desktop, apps/mobile, or apps/extension.
---

Features live in `src/features/<name>` and import only `shared` and dependencies, never another feature. A feature holds only the role files and folders in `docs/project-structure.md`, and the `v1/feature-files` lint rule rejects any other name. Scaffold the folder, then implement.

1. Scaffold:

   ```bash
   bun run generate new-feature
   ```

   Pick the app and the roles the feature needs. The generator offers only the roles that app supports and skips files that exist.

2. Implement in this order: `schemas.ts` with PascalCase schema constants, `handlers.ts` for server entry points or, in desktop, main-process handlers for the contract in `schemas.ts`, `data.ts` for query and mutation options, `hooks.ts` for state, then components. Delete scaffolded files the feature does not use.
3. Mount the feature from a route or entrypoint. Routes import features; features never import routes.
4. Run `bun template doctor --fast`, fix what it reports, then finish with `bun template doctor`.
