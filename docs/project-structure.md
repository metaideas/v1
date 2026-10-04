---
title: Project Structure
description: Navigate the application, package, infrastructure, and tooling workspaces in v1 and their import boundaries.
---

The template has the following folders:

- `apps` - Application workspaces for multiple platforms and user-facing products.
- `infra` - Infrastructure code for local development and cloud providers.
- `packages` - Shared internal package workspaces for application workspaces. Backends on hosted platforms, such as Convex, also exist here. Application workspaces consume them as libraries. They deploy independently.
- `tooling` - Shared configuration for development and helpers for scripts. Put configuration here when workspaces use it and it does not relate to a specific package workspace.

## General monorepo structure

```sh
root
  ├── apps                # Cross-platform applications
  │   ├── app               # TanStack Start web application
  │   ├── api               # Hono API with RPC client running on Bun
  │   ├── desktop           # Electron desktop application with TanStack Router
  │   ├── docs              # Astro Starlight documentation site
  │   ├── extension         # WXT browser extension
  │   ├── mobile            # Expo mobile application
  │   ├── web               # Astro marketing site and blog
  │   └── worker            # BullMQ worker that runs background jobs
  │
  ├── infra               # Infrastructure as code for cloud providers
  │   └── local             # Docker Compose configuration for local development
  │
  ├── packages            # Shared internal packages for use across apps
  │   ├── auth                  # Authentication utilities using Better Auth
  │   ├── backend               # Convex backend, generated API types, and React client
  │   ├── core                  # Shared business logic and errors, organized by domain
  │   ├── database              # Database client and ORM using Drizzle
  │   ├── email                 # Email templates and delivery through Resend or SMTP
  │   ├── jobs                  # Fire-and-forget background jobs on Redis using BullMQ
  │   ├── payments              # Payment processing utilities using Stripe
  │   ├── ui                    # Reusable UI components and design system using Shadcn/UI
  │   ├── utils                 # Shared helpers and constants for packages and apps
  │   └── workflows             # Durable background workflows using DBOS
  │
  ├── scripts             # Template commands (bun template setup, doctor, add, remove, diff)
  │
  ├── tooling             # Shared development and build tools
  │   ├── internationalization  # Inlang project configuration and translations
  │   ├── linting               # Repository lint rules for oxlint
  │   └── tsconfig              # TypeScript configuration
  │
  └── turbo               # Turborepo configuration for monorepo management
      └── generators        # Template recipes that bun run generate applies
```

## App structure

Each application workspace has a `src` folder. It contains the source code for the application workspace.

Application workspaces usually use three folders:

- The main router, such as `app` for Expo, `routes` for TanStack Start and TanStack Router, `pages` for Astro, or `entrypoints` for WXT.
- A `shared` folder for utilities and components.
- A `features` folder for vertical slices of the product.

These folders have a one-way import flow. The `features` folder can import from the `shared` folder. The `shared` folder cannot import from the `features` folder. The router folder can import from the `features` or `shared` folder. Neither folder can import from the router folder. This flow organizes the code and makes it easier to understand.

The `v1/layers` lint rule in `tooling/linting/src/rules` enforces these flows for both `#` and relative imports, and covers a new feature folder without a configuration change. A route can import style and image assets, but not another route. The `v1/layer-folders` rule keeps every source folder in a layer: a file at the root of `src` is an entrypoint, and every other file lives in `shared/`, `features/`, or a folder that the rules' options declare. The options in `oxlint.config.ts` name each application workspace's route folder, entrypoint tiers, and other composition folders, such as the API's `routes/`, whose routes compose each other.

When an application workspace has more than one entrypoint tier, such as a desktop main process and a renderer, the tiers never import each other. They communicate through a typed contract in `shared`.

Every application workspace also owns an `.env.schema` contract and a generated `src/shared/env.generated.ts` binding. See [Environment configuration](./environment.md).

### Features

A feature is a vertical slice of an application workspace. It does not import another feature. Before you import an item from another feature, move it to `shared/`.

A feature is a flat folder of files named by role. Every application workspace uses the same role names, and a feature adds a file only when it needs it, so a feature can be as small as one component.

```sh
features/<feature>/
  ├── assets/         # Static files the feature's components import
  ├── components/     # UI components, one file per exported component
  ├── constants.ts    # Static values and content, such as paths and lists
  ├── data.ts         # Client data layer: query and mutation options, Convex hooks
  ├── errors.ts       # Errors that stay inside the app
  ├── handlers.ts     # Server entry points: tRPC procedures, server functions, form actions, durable workflows, job handlers
  ├── hooks.ts        # React hooks for local and derived state
  └── schemas.ts      # Schemas for forms, search params, and local models
```

| Role                                      | API | App | Desktop | Extension | Mobile | Web | Worker |
| ----------------------------------------- | --- | --- | ------- | --------- | ------ | --- | ------ |
| `assets/`, `components/`                  |     | ✓   | ✓       | ✓         | ✓      | ✓   |        |
| `constants.ts`, `errors.ts`, `schemas.ts` | ✓   | ✓   | ✓       | ✓         | ✓      | ✓   | ✓      |
| `data.ts`, `hooks.ts`                     |     | ✓   | ✓       | ✓         | ✓      |     |        |
| `handlers.ts`                             | ✓   | ✓   |         |           |        |     | ✓      |

- A role file that grows becomes a folder of the same name with one file per item, such as `handlers/sign-in.ts`. No other folder names exist inside a feature.
- `handlers.ts` implements what the app exposes. It defines no contracts of its own. Payloads and errors that cross applications belong in `@v1/core` or the package workspace that owns them.
- Components reach the server through `data.ts` or `hooks.ts`. TanStack Start server functions are the exception: components and routes call them from `handlers.ts` directly, because a server function is already its own client entry point.
- `schemas.ts` and `errors.ts` hold only what the app owns. Types derive from schemas with `z.infer`, so features have no `types.ts`.
- A helper lives in the file that uses it until another feature needs it. Then it moves to `shared/`.
- Desktop features run in the renderer. Main-process code stays in `shell/`.

The `v1/feature-files` lint rule in `tooling/linting/src/rules` enforces these names. Run `bun run generate new-feature` to scaffold a feature with the roles its application workspace supports.

Each application workspace below follows the layout above. The trees show the folders that differ between frameworks; look inside a workspace for its current files.

### API

A Hono server on Bun. It serves tRPC, versioned REST routes, and the Files SDK gateway, and runs durable workflows in process. `src/client.ts` is the only module that other application workspaces can import.

```sh
apps/api/src
  ├── routes/       # Hono routes; routes can compose other routes
  ├── shared/       # Auth, middleware, tRPC context, and service composition
  ├── features/     # Feature folders
  ├── client.ts     # Typed client for other apps
  └── index.ts      # Server entry point
```

### Worker

A Bun process that consumes `@v1/jobs` queues. It serves no HTTP. Run more than one to share the load of a queue; each job goes to one of them.

```sh
apps/worker/src
  ├── shared/       # Logger and app-wide utilities
  ├── features/     # Feature folders whose handlers.ts handles jobs
  └── index.ts      # Worker entry point that subscribes to queues
```

### App

A full-stack TanStack Start web application.

```sh
apps/app/src
  ├── routes/       # File-based routes, grouped by authentication state
  ├── shared/       # Components, auth server, server middleware, and app-wide utilities
  ├── features/     # Feature folders
  └── router.tsx    # Router factory and context
```

### Mobile

An Expo and React Native application.

```sh
apps/mobile/src
  ├── app/          # Expo Router routes
  ├── shared/       # Components, styles, and app-wide utilities
  └── features/     # Feature folders
```

### Desktop

An Electron Forge application with a TanStack Router renderer.

```sh
apps/desktop/src
  ├── shell/        # Electron main process and preload script
  ├── renderer/     # Renderer entry and file-based routes
  ├── shared/       # Components, utilities, and the typed shell-renderer bridge
  └── features/     # Feature folders
```

### Extension

A WXT browser extension.

```sh
apps/extension/src
  ├── entrypoints/  # WXT entrypoints such as background and popup
  ├── shared/       # Assets and utilities
  └── features/     # Feature folders
```

### Docs

A standalone Astro Starlight documentation site with sample pages.

```sh
apps/docs/src
  ├── content/docs/       # Documentation pages by locale
  ├── pages/              # Custom pages
  └── shared/             # Component overrides, styles, and constants
```

### Web

An Astro marketing site and blog.

```sh
apps/web/src
  ├── pages/        # Localized pages
  ├── content/      # Content collections, such as blog posts by locale
  ├── shared/       # Layout components and constants
  └── features/     # Feature folders
```

## Package structure

Package workspaces do not have a strict structure. A general guideline places all runtime code in the `src` folder. It places scripts in the `scripts` folder.

```sh
packages/package-name
  ├── src/                    # Source code
  └── scripts/                # Scripts
```

Run the following command to create a new package workspace:

```sh
bun run generate new-package
```

Apply the `connect-backend` skill to connect an application workspace to an existing backend
workspace. See [Project generators](./generators.md) for the generator workflows.
