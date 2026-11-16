---
title: Environment Configuration
description: Own, validate, generate, and deploy environment values with Varlock.
sidebar:
  order: 4
---

v1 uses Varlock as its system for environment contracts and loading. An application workspace owns its complete contract in `.env.schema`. A package workspace owns only fragments that its consumers can select under `env/`.

## Ownership and files

Use these names for package fragments only when necessary:

- `.env.shared`: non-sensitive values for use across runtimes.
- `.env.client`: values explicitly allowed in browser or native bundles.
- `.env.server`: server-runtime values, including secrets.
- `.env.build`: build, upload, and deployment-tool values that must not enter a client bundle.

A package workspace does not read `ENV`. It exports fragments, and applications pass the values to its factories. A package keeps a root schema only when its own scripts, such as database migrations, need environment values. An application schema imports fragments for its selected package workspaces. It declares application-owned keys. Do not add a central preset. Do not import a package contract into an application workspace that does not consume it.

`.env.schema` owns key names, types, requirements, sensitivity, descriptions, and safe defaults. Commit `.env.development` only when its values are safe for every clone. Use an ignored `.env.local` for personal overrides. CI, preview, and production values come from the deployment environment or an explicit secret store.

## Change a key

Add or change the key in its owner schema or package fragment. Use Varlock decorators to describe the key:

```dotenv
# Public API origin used by the browser bundle.
# @public @static @required @type=url
PUBLIC_API_URL=

# Server credential. Sensitive is the default in server contracts.
# @sensitive @required @type=string(minLength=32)
API_SECRET=

# Optional feature flag with a safe default.
# @public @type=boolean
FEATURE_ENABLED=false
```

`@public` is an explicit decision to bundle a value. The spelling of a prefix is not a security boundary. Use `@dynamic` for runtime values. Use `@static` for values embedded at build time. Use `@optional`, `@required`, defaults, and type constraints to preserve the actual runtime contract.

After you add, rename, deprecate, or remove a key, update safe development values. Regenerate types. Then validate:

```sh
pnpm run codegen
pnpm run env:check
pnpm run check
```

Varlock writes `env.generated.ts`. Import the generated binding directly. Keep the literal uppercase `ENV.<KEY>` identifier. The Varlock integrations for Vite and Expo require this identifier for static replacement in client bundles:

```ts
import { ENV } from "#shared/env.generated.ts"
```

Do not read project configuration from `process.env` or `import.meta.env` in application code. Do not alias the generated binding to lowercase `env`. Do not edit the generated file by hand. The file is not in version control: `pnpm run codegen` regenerates it.

## Environment selection

`VARLOCK_ENV` selects development, test, preview, or production. Local commands use safe `.env.development` values and `.env.local` overrides. CI and deployment commands must set their target explicitly. Before a remote build or mutation, run `varlock load` or the workspace's wrapped command. Node does not load dotenv files automatically. This prevents precedence-rule conflicts.

Required production credentials are absent from committed development files when no safe substitute exists. Every Varlock workspace owns an `env:check` script that runs `varlock load`. The root `pnpm run env:check` runs these scripts in parallel through Turbo. Turbo passes deployment variables without a cached validation result.

## Framework boundaries

- Register the Varlock plugin or integration first, before other plugins that read configuration.
- Application modules read configuration only through the typed `ENV` binding.
- A framework configuration file that runs before the Varlock plugin can read only launcher-supplied values such as `PORT`.
- When a framework evaluates a configuration file before bundling and offers no plugin seam, that file is the one place that can read `process.env`. Run its commands through Varlock.

Run `pnpm run env:scan` to build each client artifact and scan it for sensitive values in the committed development contract. Scans use explicit paths for schemas and development fixtures. Ignored local overrides cannot change CI results. Each workspace verifies its expected artifact directory before a scan. A missing build fails instead of passing without a result.

## Deployment secrets

Plain secrets in the hosting, worker, or EAS platform are the supported default. Set the target environment explicitly. Before deployment, validate the configuration. Never echo resolved values. Development, preview, and production must use separate credentials. Preview must not inherit production secrets implicitly.

1Password is the reference optional secret store. A scaffolded-project owner can install the Varlock 1Password plugin. Use schema references with this form. Replace the identifiers with your identifiers:

```dotenv
# @sensitive @required
SERVICE_TOKEN=op://<environment-vault>/<application-item>/credential
```

For local work, sign in with the 1Password desktop application or CLI. Before you start the application workspace, confirm access with an agent-safe `varlock load`. For CI, use a scoped 1Password service-account token from the CI platform as secret zero. Never commit it. Do not put it in a generated dotenv file. Give each environment a separate vault or item with the narrowest read access.

To rotate a credential, update the target store. Validate a command that does not mutate data. Deploy. Then revoke the old value. On access denial, confirm the account, vault, item, and environment before you change schema references. Logs, summaries, snapshots, generated files, and build artifacts must remain redacted. Use agent-safe output and workspace artifact scans to verify this.

## Convex

Convex backend values do not pass through Varlock. Declare required keys in `packages/backend/src/functions/convex.config.ts`. Read the generated native `env` API. Parse arrays and other structured strings at the backend boundary. Configure values with the Convex dashboard or CLI for each deployment. Authenticate CI with a scoped Convex deploy key.

Do not synchronize Varlock-resolved values into Convex. Expo and other clients own their non-sensitive Convex deployment and site URLs in their application schema. A local Convex command can generate ignored `.env.local` client URLs. These values remain local data, not a second contract.

## Template commands

The `connect-backend` skill adds only schema keys and development values for the selected connection. Removing a backend-specific key does not remove a similarly named application key. After you change workspace selection, run `pnpm template doctor`. It reports environment imports that point at deleted packages.
