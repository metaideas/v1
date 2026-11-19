---
"@metaideas/create-v1": patch
---

Fix projects from `pnpm template setup` failing `check` and `analyze` before any change

Setup now sorts the dependency lists that the scope rename reorders, formats the project after Expo prebuild, and installs without a frozen lockfile so it also runs in CI. It fails when it leaves the template scope, a `TEMPLATE:START` marker, or the template README behind.
