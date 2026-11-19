---
"@metaideas/create-v1": minor
---

Declare each workspace's lint layers, feature roles, and Knip settings in its own `package.json`

Each application workspace lists its route folder, entrypoint tiers, allowed feature roles, and handler shape in a `workspace` field in its `package.json`, and any workspace can add its Knip settings there. The `v1/*` lint rules, `knip.config.ts`, and `pnpm run generate new-feature` read that field, so removing a workspace's folder removes its settings. `v1/feature-files` now rejects a role that the app doesn't allow, such as `middleware.ts` in an `apps/web` feature.
