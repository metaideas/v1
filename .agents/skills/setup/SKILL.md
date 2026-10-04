---
name: setup
description: Configure a project freshly created from the v1 template. Use when the repository still has the template name, a v1 field in package.json, or the user asks to set up, configure, or trim the template.
---

Turn the template into the user's project. `bun template setup` does the mechanical part; you choose what it keeps.

1. Ask what the product is and which surfaces it needs. Map the answer to workspaces:
   - `apps/app` for a full-stack web application, `apps/web` for a marketing site, `apps/docs` for documentation, `apps/mobile` for Expo, `apps/desktop` for Electron, `apps/extension` for a browser extension.
   - `apps/api` for a separate Hono service, `packages/backend` for Convex. Neither is required; `apps/app` is full-stack on its own.
   - Package workspaces such as `auth`, `database`, `email`, `payments`, `workflows` only when the product needs them. Setup keeps any package a kept workspace depends on.
2. Confirm the project name. It becomes the root package name and the npm scope of every package workspace.
3. Run setup non-interactively with the choices:

   ```bash
   bun template setup --yes --name <name> --keep-apps <a,b> --keep-packages <c,d>
   ```

   Add `--no-git` when the repository already has history and `--no-install` when the user will install later.

4. Run `bun template doctor` and fix everything it reports. Removing workspaces often leaves an env key in the `build` task of `turbo.json` or a doc page for a deleted surface.
5. Report the kept workspaces, the scope, and the doctor result.
