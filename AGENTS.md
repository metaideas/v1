# AGENTS.md

<!-- TEMPLATE:START -->

`v1` is a modern, opinionated monorepo template for TypeScript projects. It is designed to easily deploy products spanning multiple platforms.

## Working with `v1`

When working with `v1`, you should always keep the following in mind:

1. This is a template, not a finished product. There will be gaps in the implementation that scaffolded projects will need to fill in. This is fine, as long as we don't ship anything in a broken state.
2. Consistency is paramount. We reduce cognitive overhead by making sure that all application workspaces are structured similarly, and all package workspaces are structured similarly.
3. Every workspace is selectable. After you remove one, the rest must still build, with no leftover imports or required environment variables. Dependencies point one way. Application workspaces depend on package workspaces. Package workspaces depend only on `@v1/core`, `@v1/utils`, and `@v1/ui`, so removing a package workspace means deleting its lines from each composition root. `@v1/core` can depend on `@v1/utils`, and `@v1/utils` and `@v1/ui` depend on no other workspace. Any workspace can depend on a tooling workspace. `bun template doctor` checks these rules.
4. Package workspaces own their domain. Constants, types, and environment fragments live in the package workspace that uses them.
5. `@v1/utils` is not a junk drawer. Add a helper there only when several workspaces use it and no single package workspace owns it.
6. Prefer a small, focused dependency over custom code. Delete code that nothing uses.
7. A package workspace owns a contract that is not its vendor's API, such as templates, a schema, a state machine, or a configuration policy. If replacing the vendor would change the package's public API one for one, delete the package and let applications use the vendor directly. Instrumentation, such as logging, error monitoring, and product analytics, belongs to application workspaces, and template recipes add the optional vendors.
8. Local development works with only the repository and its Docker Compose services. Cloud services and external accounts are opt-in.
9. Keep the scaffold small. Ship optional code as a template recipe in `turbo/generators/` that a scaffolded project adds when it needs it. Add code to a workspace only when every scaffolded project that selects the workspace uses it.
10. Content that only maintainers use is an internal cleanup path, and `bun template setup` removes it. List a whole file or folder in `v1.cleanupPaths` in the root `package.json`. For part of a file that ships, wrap it in `TEMPLATE:START` and `TEMPLATE:END` comments and list the file in `v1.cleanupSections`.

## Template vocabulary

Use these terms in issues, plans, code, and documentation. Do not use the alternatives.

- **Template**: the upstream `metaideas/v1` repository before developers install it. Not "starter" or "boilerplate".
- **Scaffolded project**: a separately owned repository that developers create from the template. Not "template instance" or "downstream template".
- **Workspace**: a selectable application workspace or package workspace. Not "module" or "project".
- **Application workspace**: a product surface that users see or that runs independently. Not "app package".
- **Package workspace**: runtime code that application workspaces or other package workspaces share. Not "application package".
- **Template recipe**: copy-once code in `turbo/generators/` that a scaffolded project owns after generation. Not "plugin" or "recipe package".
- **Template command**: a local command that configures a scaffolded project or manages its workspaces, such as `bun template setup` or `bun template doctor`. Use "Turbo generator" only for the mechanism that runs a template recipe.
- **Internal cleanup path**: content that only maintainers use. Setup removes it from a scaffolded project.
- **Backend alternative**: an optional backend shape that a scaffolded project selects. Not "required backend" or "backend layer".
- **Preset**: a reusable configuration for an environment or tooling that a template command selects.
- **Skill**: an agent workflow in `.agents/skills/` that drives template commands and generators toward a passing `bun template doctor`.

<!-- TEMPLATE:END -->

## Skills

Template work runs through the skills in `.agents/skills/`. Each skill states which template command or Turbo generator does the mechanical part and ends with `bun template doctor`; a passing doctor is the definition of done for setup, workspace changes, backend connections, and template updates. Reach for `setup`, `add-workspace`, `remove-workspace`, `connect-backend`, `new-package`, `new-feature`, `update-from-template`, or `doctor` before editing those areas by hand.

## Architecture

Before you explore or change code, read `docs/project-structure.md`. Use the same vocabulary in issues, plans, code, and documentation. Before you add a term, verify that it names a real distinction, then define it once in the package workspace that owns the domain.

## Coding standards

Before you write or review code, read `CODING_STANDARDS.md`. It covers TypeScript style, services, imports and boundaries, UI, components, tests, comments, READMEs, commits, and conventions for each workspace.

## Generated files

Each generated file follows the guidance of the tool that produces it.

- Committed: `routeTree.gen.ts` (TanStack Router) and `_generated/` under `packages/backend/src/functions/` (Convex). The framework `dev` or `build` command regenerates them. Commit the result with the change that caused it.
- Ignored: `env.generated.ts` (Varlock), `src/shared/internationalization/` (Paraglide), `.astro/` (Astro), and `.wxt/` (WXT). `bun run check` does not generate them.
- After you clone the repository, create a worktree, or install dependencies, run `bun run codegen`.
- After you change an `.env.schema` file, a package `env` contract, or the internationalization messages, run `bun run codegen` again.

<!-- ADAMANTITE:START -->

## Adamantite

This project uses Adamantite for its managed formatting, linting, type checking, and dependency-analysis setup.

- Prefer the package scripts Adamantite added for this workspace.
- Run `bun run check` to catch lint and type issues. Direct command: `adamantite check`.
- Run `bun run fix` to apply safe lint fixes. Direct command: `adamantite fix`.
- Run `bun run analyze` after changing dependencies, imports, or exports. Direct command: `adamantite analyze`.
- Use `adamantite doctor` to inspect managed setup and `adamantite doctor --fix` for safe local fixes.

<!-- ADAMANTITE:END -->
