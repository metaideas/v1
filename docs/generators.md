---
title: Project Generators
description: Use local template recipes to add features, package workspaces, and optional integrations.
---

Run `bun run generate` to open the Turbo generator menu. Template commands use local template recipes from the exact template snapshot in the project. They do not download a catalog. They do not update previously generated files. They do not track template drift.

`turbo/generators/config.ts` registers each implementation in `turbo/generators/commands`. Put generated source in Handlebars files under `templates/`. Keep each template command direct and self-contained. Do not add shared recipe, adapter, or utility layers.

## Create project scaffolds

`new-feature` creates a feature folder under `src/features` with the roles you select. It offers only the roles the application workspace supports. See [Features](./project-structure.md#features).

```bash
bun run generate new-feature
```

`new-package` creates a workspace under `packages/`. It uses the current npm scope, shared TypeScript configuration, and TypeScript version of the project:

```bash
bun run generate new-package
```

Both scaffold template commands preserve existing files on a repeat run.

## Connect a backend

Backend connections are not a generator. The `connect-backend` skill in `.agents/skills/connect-backend/` carries the supported connections, their environment keys, and reference sources. A coding agent applies it and verifies the result with `bun template doctor`.

## Add a Files SDK client

`apps/api` includes an authenticated Files SDK gateway. Its access policy (authentication, key scoping, accepted content types, and upload size) lives in the gateway composition in `apps/api/src/shared/`. Treat a change to that policy as a security change and review it as one.

Generate the optional client in an application workspace that consumes the API:

```bash
bun run generate files-client
```

The template command can target any workspace under `apps/` and asks for the Files SDK endpoint. It creates an application-local module in `src/shared/` that exports authenticated React hooks for uploads, downloads, listings, and searches. A repeat run reports skips without replacing generated application code.

## Add Sentry

Application workspaces log with evlog and need no external account. Error monitoring is opt-in. `sentry` adds the Sentry SDK to `apps/api`, `apps/app`, or `apps/mobile`:

```bash
bun run generate sentry
```

The template command installs the SDK for the runtime of the workspace, adds a module that initializes it, and declares the Sentry variables in the workspace's `.env.schema` as optional. Without a DSN, Sentry stays off. In `apps/api` it also ships evlog events to Sentry through a drain, flushes the drain on shutdown, and reports unhandled errors from `app.onError`. In `apps/mobile` it adds the Expo config plugin and the Metro configuration. Run `bun run --filter mobile prebuild` afterward to update the native projects.

The template command connects the module where the generated application still matches the template. Where an edit does not apply, it prints the step to finish by hand. A repeat run reports skips without replacing generated application code.

## Add PostHog

Product analytics is opt-in. `posthog` adds PostHog to `apps/api`, `apps/app`, or `apps/mobile`:

```bash
bun run generate posthog
```

The template command installs the SDK for the runtime of the workspace and declares the PostHog variables in the workspace's `.env.schema`. The project key is optional, and PostHog stays off without it. In `apps/api` it adds a server client and shuts it down with the process. In `apps/app` and `apps/mobile` it adds an analytics provider and wraps the existing providers with it. The mobile provider captures screens from the Expo Router pathname. In `apps/mobile`, the template command also installs the Expo modules PostHog reads device details from, so run `bun run --filter mobile prebuild` afterward to update the native projects. Identify users with `usePostHog().identify()` once a session loads. On mobile, the hook returns `undefined` when no project key is set, so call `usePostHog()?.identify()`.

Where an edit does not apply, the template command prints the step to finish by hand. A repeat run reports skips without replacing generated application code.

## Add a jobs dashboard

`bull-board` adds a [bull-board](https://github.com/felixmosh/bull-board) dashboard for the `@v1/jobs` queues to `apps/api`:

```bash
bun run generate bull-board
```

The template command installs bull-board and the BullMQ version that `packages/jobs` uses, adds `src/shared/jobs-dashboard.ts`, and mounts the dashboard at `/jobs` outside the typed router, so it does not change the API client or the OpenAPI document. The dashboard opens one queue for each name in `@v1/jobs/queue-names` and closes them with the process. It rejects cross-site form posts, and it is protected by basic auth: set `JOBS_DASHBOARD_USERNAME` and a `JOBS_DASHBOARD_PASSWORD` of at least 16 characters in `apps/api`. Without them, `/jobs` is not mounted. From the dashboard you can retry, promote, and remove jobs, so share the credentials only with people who operate the queues.

The dashboard copies the shadcn theme from `packages/ui/src/styles/globals.css` into bull-board's `uiConfig.theme`, so it uses the same colours, radius, and fonts as the other application workspaces in light and dark mode. The job status colours and the chart colours stay bull-board's, because they carry the meaning of each status. The theme is copied once, when the template recipe runs, so regenerate it or edit `uiConfig.theme` after you change `packages/ui`. Without `packages/ui`, the dashboard keeps bull-board's own theme.
