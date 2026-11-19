---
"@metaideas/create-v1": minor
---

Build each server app's services in one object, and give packages explicit exports and `create*` factory names

`apps/api` handlers read each service by name, such as `c.var.database`, tRPC procedures read `ctx.database`, and `apps/app` server functions read `context.services`. Each composition root exports `services` and a `close` function, and `@v1/database` closes its pool with `database.close()`. Server-only modules are named `server`, such as `@v1/database/server`, `@v1/payments/server`, and `@v1/workflows/server`, and every factory starts with `create`, such as `createTransport` and `createExpoClient`. Package exports list each subpath instead of a wildcard. `@v1/auth` builds the server and Convex auth from one `createAuthOptions` policy, and `pnpm run generate new-package` creates a package with the same shape as the existing ones.
