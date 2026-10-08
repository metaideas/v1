---
name: doctor
description: Verify a project scaffolded from v1 and fix what it reports. Use after any template command, workspace change, or backend connection, and when asked whether the project is healthy.
---

Run the doctor and fix every failure it reports. The doctor is the definition of done for template work: a run with no failures is the completion criterion.

```bash
bun template doctor        # full run, including bun run build
bun template doctor --fast # skips the build while iterating
```

Each check prints the file and the reason. Fix the cause, not the check:

- **Scope references**: a file still uses the template scope. Replace it with the project scope.
- **Workspace dependency**: a manifest depends on a workspace that is gone. Remove the dependency and the imports that used it, or restore the workspace with `bun template add`.
- **Environment import or generated types**: an `.env.schema` imports a fragment from a removed package, or codegen has not run. Delete the `@import` line and the keys that came from it, or run `bun run codegen`.
- **Turbo build env**: a pattern in the `build` task of `turbo.json` matches no declared key. Remove the pattern.
- **Template content**: cleanup markers, `v1` fields, or a missing stamp commit. In a scaffolded project remove the leftovers. In the template itself, restore the marker or path.
- **README**: `README.md` is still the template README. Rewrite it with the project name, a one-sentence description, the kept workspaces, and links to `docs/`.
- **Backend connection**: an app has a client file whose backend workspace or dependency is missing. Follow the connect-backend skill or delete the client file.
- **Tool failures**: read the printed output from `check`, `boundaries`, `analyze`, `env:check`, or `build` and fix the reported files.

Finish with a full run, not a `--fast` run.
