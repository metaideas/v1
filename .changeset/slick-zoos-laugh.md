---
"@metaideas/create-v1": minor
---

Use tRPC by default in the TanStack Start app and forward its `/api` requests to the Hono API. Setup keeps `apps/api` whenever you select `apps/app`.

For an existing deployment, set `API_URL` on the app to the API origin. Set `AUTH_WEB_ORIGIN` on the API to the app's public origin. Register the app's `/api/auth/callback/<provider>` with the OAuth providers you use. Keep the database, auth, and email credentials on the API deployment. If the app previously had its own auth database, migrate those accounts to the API database before switching traffic. Users with sessions from the old app auth server sign in again after the switch.
