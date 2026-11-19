---
"@metaideas/create-v1": minor
---

Remove `pnpm template doctor` and enforce its checks with lint, `turbo boundaries`, and tests

Projects no longer get the doctor command or skill. `pnpm run boundaries` rejects a package workspace that depends on another capability package. The `v1/package-env` lint rule rejects package source that reads `ENV`, and `v1/core-services` rejects a `@v1/core/services/` folder named after a package. Root tests in `__tests__/` check `turbo.json` env lists and documentation links. To verify a project, run `pnpm run check`, `analyze`, `boundaries`, `env:check`, `build`, and `test`, or add your own verification skill.
