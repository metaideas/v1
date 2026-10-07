---
title: Getting Started
description: Create a v1 project, select its workspaces, and start the local development environment.
sidebar:
  order: 2
---

## Prerequisites

- Use [bun](https://bun.sh/) as the package manager.
- Install Node.js. See the tooling requirements below.
- Install Docker to run the local services: Postgres, Redis, MinIO, Mailpit, and the Inngest Dev Server. Use [OrbStack](https://orbstack.dev/) to manage containers.

## Tooling Expectations

- Bun: the version in the root `package.json` `packageManager` field.
- Node.js: the range in the root `package.json` `engines` field.

## Create a Project

```bash
bun create metaideas/v1 my-app
cd my-app
```

## Setup

1. Install the dependencies with `bun`:

```bash
bun install
```

2. Configure the template:

```bash
bun template setup
```

The command does the following:

- It lets you select the workspaces to include.
- It renames the project and updates all imports.
- It rewrites `README.md` to describe the project and its workspaces.
- It initializes a Git repository when necessary.
- It removes the internal template files.
- It installs the dependencies.

### Choosing Workspaces

`template setup` prompts first for application workspaces and then for package workspaces. Add workspaces later with `bun template add app <name>` or `bun template add package <name>`.

### Choosing a Backend

- Keep the TanStack Start server routes and functions in `apps/app` for a full-stack web application without a separate backend deployment.
- Keep `packages/backend` when clients such as `apps/mobile` need Convex real-time data, managed functions, and a hosted database.
- Keep `apps/api` for a self-managed Hono service, OpenAPI routes, or infrastructure control.

These are alternatives, not layers that every project must run. Application workspaces connect to a backend explicitly. No client connects to `packages/backend` by default.

After you select a backend alternative, connect an application workspace with the `connect-backend` skill in `.agents/skills/`. It configures local connections. It does not deploy a backend or create external credentials.

3. Generate source files and types. Run the command again after you change an environment contract or a message catalog:

```bash
bun run codegen
```

Application contracts are in `.env.schema`. Safe local values are committed in `.env.development`. Put personal overrides in `.env.local`. Then run `bun run env:check`. See [Environment configuration](./environment.md) for package contracts, production values, and secret stores.

4. Start the local services with `docker`:

```bash
bun run docker:up
```

5. Start the development servers:

```bash
bun run dev
```

Each workspace serves on a fixed local port. See [Development servers](./development.md#development-servers) for the port convention and where each workspace declares its port.

At the repository root, `bun run dev` runs all workspaces through Turbo. Inside a workspace, the same command starts that workspace alone.

### First Run Checklist

- Run `bun template setup`.
- Generate source files and types with `bun run codegen`.
- Start services with `bun run docker:up`.
- Start the development servers with `bun run dev`.

#### Infrastructure Ports

Docker Compose services use fixed host ports in the `8000` block, declared in `infra/local/docker-compose.yml`. These ports can conflict with other projects on the same machine.

### Troubleshooting

- For a Bun version mismatch, compare `bun --version` with the `packageManager` field in the root `package.json`.
- For a Node.js version mismatch, install a version in the `engines` range with your version manager.
- When Docker services do not run, examine `docker ps`. Then run `bun run docker:up`.
- When Postgres exits with "in 18+, these Docker images are configured to store database data in a format which is compatible with pg_ctlcluster", the local data comes from an older major version. See [Upgrading local Postgres](#upgrading-local-postgres).
- For missing environment variables, run `bun run env:check`. Then examine the owning `.env.schema` and the ignored `.env.local` overrides.
- For a port conflict, find the process with `lsof -i :<port>`. See [Development servers](./development.md#development-servers) for where each port is declared.
- Expo on a physical device requires the development machine's LAN IP instead of `localhost`.

#### Upgrading Local Postgres

Postgres cannot read data from an older major version. To start over, run `bun run docker:down`, move the old data aside, then run `bun run docker:up` and `bun run db:migrate`:

```bash
docker run --rm -v "$PWD/infra/local/.data:/data" alpine mv /data/postgres /data/postgres-17
```

To keep the data, dump it with the old version before you move it, then restore it into the new one:

```bash
bun run docker:down
docker run -d --name postgres-17 -e POSTGRES_PASSWORD=postgres -v "$PWD/infra/local/.data/postgres:/var/lib/postgresql/data" postgres:17
until docker exec postgres-17 pg_isready -U postgres; do sleep 1; done
docker exec postgres-17 pg_dumpall -U postgres > postgres-17.sql
docker rm -f postgres-17
docker run --rm -v "$PWD/infra/local/.data:/data" alpine mv /data/postgres /data/postgres-17
bun run docker:up
docker compose -f infra/local/docker-compose.yml exec -T postgres psql -U postgres -d postgres < postgres-17.sql
```

The restore reports that the `postgres` role and the `main` database already exist. You can ignore those errors.
