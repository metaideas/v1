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

| Command                | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `bun run dev`          | Start all workspaces on their fixed local ports.                     |
| `bun run dev:apps`     | Start application workspaces.                                        |
| `bun run dev:packages` | Start package workspaces.                                            |
| `bun run build`        | Build all workspaces.                                                |
| `bun run start`        | Run the `start` task of each workspace.                              |
| `bun run clean`        | Remove build artifacts.                                              |
| `bun run check`        | Run Adamantite lint, format, and type checks.                        |
| `bun run fix`          | Apply safe lint fixes and format code.                               |
| `bun run analyze`      | Detect unused dependencies, files, and exports.                      |
| `bun run codegen`      | Generate workspace source and environment types.                     |
| `bun run env:check`    | Validate Varlock workspaces in parallel.                             |
| `bun run env:scan`     | Build client artifacts and scan for sensitive values.                |
| `bun run test`         | Run the test suite.                                                  |
| `bun run test:watch`   | Run the test suite in watch mode.                                    |
| `bun run db:push`      | Push the Drizzle schema to the database.                             |
| `bun run db:migrate`   | Run the Drizzle migrations.                                          |
| `bun run docker:up`    | Start the local services.                                            |
| `bun run docker:down`  | Stop the local services.                                             |
| `bun run boundaries`   | Check Turborepo workspace boundaries and tags.                       |
| `bun run generate`     | Run a template recipe with Turbo generators.                         |
| `bun template`         | Run a template command (`setup`, `doctor`, `add`, `remove`, `diff`). |
| `bun run scripts`      | Run the project script entry point.                                  |

To run a command for one workspace, use this syntax:

```bash
bun run <command> --filter <workspace>
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

- `bun run bump:deps` - Update dependencies interactively across workspaces.
- `bun run analyze` - Detect unused dependencies, files, and exports.

## Template Management

- `bun template setup` - Configure the project and record its template version.
- `bun template doctor` - Verify workspace selection, environment contracts, and tooling.
- `bun template add <kind> <name>` - Add a workspace from the template at the recorded commit.
- `bun template remove <kind> <name>` - Delete a workspace and list what still references it.
- `bun template diff` - Show upstream template changes since the recorded commit.
- `bun run scripts` - Run the extensible entry point for scripts that the project owns.

The skills in `.agents/skills/` drive these commands. See [Template commands](./template-commands.md).
