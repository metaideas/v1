---
"@metaideas/create-v1": patch
---

Fix `pnpm run test` after applying the `bull-board`, `sentry`, or `posthog` recipe to `apps/api`. The recipe tests also pass in projects that omit `apps/api`.
