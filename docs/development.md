---
title: Development
description: Run, build, test, and maintain a v1 project with Node, Bun, Turbo, and Adamantite.
sidebar:
  order: 3
---

## Tooling Requirements

Node runs the application workspaces, scripts, and tests. Bun installs packages and runs package scripts. The root `package.json` is the source of truth for tool versions: `packageManager` pins Bun and `engines` sets the minimum Node.js version.

## Commands

These commands match the scripts in the root `package.json`.

| Command                 | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `pnpm run dev`          | Start all workspaces on their fixed local ports.                     |
| `pnpm run dev:apps`     | Start application workspaces.                                        |
| `pnpm run dev:packages` | Start package workspaces.                                            |
| `pnpm run build`        | Build all workspaces.                                                |
| `pnpm run start`        | Run the `start` task of each workspace.                              |
| `pnpm run clean`        | Remove build artifacts.                                              |
| `pnpm run check`        | Run Adamantite lint, format, and type checks.                        |
| `pnpm run fix`          | Apply safe lint fixes and format code.                               |
| `pnpm run analyze`      | Detect unused dependencies, files, and exports.                      |
| `pnpm run codegen`      | Generate workspace source and environment types.                     |
| `pnpm run env:check`    | Validate Varlock workspaces in parallel.                             |
| `pnpm run env:scan`     | Build client artifacts and scan for sensitive values.                |
| `pnpm run test`         | Run the test suite.                                                  |
| `pnpm run test:watch`   | Run the test suite in watch mode.                                    |
| `pnpm run db:push`      | Push the Drizzle schema to the database.                             |
| `pnpm run db:migrate`   | Run the Drizzle migrations.                                          |
| `pnpm run docker:up`    | Start the local services.                                            |
| `pnpm run docker:down`  | Stop the local services.                                             |
| `pnpm run boundaries`   | Check Turborepo workspace boundaries and tags.                       |
| `pnpm run generate`     | Run a template recipe with Turbo generators.                         |
| `pnpm template`         | Run a template command (`setup`, `doctor`, `add`, `remove`, `diff`). |
| `pnpm run scripts`      | Run the project script entry point.                                  |

To run a command for one workspace, use this syntax:

```bash
pnpm run <command> --filter <workspace>
```

Each workspace splits generation into `codegen:*` scripts, one for each generator, and its `codegen` script runs them in parallel. When two generators write the same output, chain them in one `codegen:*` script so that only one process writes at a time. Keep generator options that a framework configuration repeats, such as a Paraglide strategy, identical in both places. You can run one `codegen:*` script on its own during development.

## Development Servers

Each HTTP-serving workspace runs its framework command directly as its `dev` script on a fixed local port. Ports follow one convention so that they do not collide:

| Block  | Used by                                         | Declared in                                                                                                                |
| ------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `3000` | Application workspaces                          | The `PORT` default in the workspace's `.env.schema`, or the `dev` script fallback when the framework starts before Varlock |
| `4000` | Package development servers, alphabetical order | The `${PORT:-<port>}` fallback in the workspace's `dev` script                                                             |
| `8000` | Docker Compose services                         | `infra/local/docker-compose.yml`                                                                                           |

To find a workspace's URL, read its port from the place the table names. When you add a workspace that serves HTTP, give it the next free port in its block. Framework configuration reads the port from the typed `ENV` binding rather than hard-coding it.

## Managing Dependencies

- `pnpm run bump:deps` - Update dependencies interactively across workspaces.
- `pnpm run analyze` - Detect unused dependencies, files, and exports.

## Template Management

- `pnpm template setup` - Configure the project and record its template version.
- `pnpm template doctor` - Verify workspace selection, environment contracts, and tooling.
- `pnpm template add <kind> <name>` - Add a workspace from the template at the recorded commit.
- `pnpm template remove <kind> <name>` - Delete a workspace and list what still references it.
- `pnpm template diff` - Show upstream template changes since the recorded commit.
- `pnpm run scripts` - Run the extensible entry point for scripts that the project owns.

The skills in `.agents/skills/` drive these commands. See [Template commands](./template-commands.md).
