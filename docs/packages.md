---
title: Package Guidance
description: Understand the shared package workspaces, hosted backend package, key-value storage, job, and workflow conventions in v1.
---

Shared libraries and hosted backends are in `packages/`. Application workspaces consume them through workspace dependencies. Package names use the configured scope of the project.

Use `bun template add package <name>` to restore an available package workspace that setup removed. See [Project structure](./project-structure.md) for the full package catalog.

## Services

A package workspace is a service that applications compose. It exports `create*` factories and never creates clients, reads `ENV`, or configures process-wide state when imported. Each application builds its services once in its composition root (`#shared/services.ts`, or `#shared/server/services.ts` in a full-stack application), passes configuration from its own `ENV`, and hands the instances to handlers through the framework context:

```ts
export const database = createDatabase({ logger: log, url: ENV.DATABASE_URL })

export const auth = createServerAuth({
  database,
  sendPasswordReset: ({ email, url }) =>
    mailer.send("password-reset", { appName, resetUrl: url }, { to: [email] }),
  // ...
})
```

Packages do not import each other, apart from `@v1/core`, `@v1/utils`, and `@v1/ui`. When a package needs another capability, it declares the smallest interface it needs, such as `sendPasswordReset` above, and the application connects the two. `bun template doctor` reports a package that depends on another capability package or reads `ENV` in its source.

## Convex Backend

`packages/backend` is a hosted backend built with Convex and Better Auth. Application workspaces consume its generated API types and React client as a package workspace. Convex deploys the functions independently.

`@v1/backend/client` and `@v1/backend/client/auth` re-export the Convex, Convex React Query, and Convex Better Auth client libraries on purpose, including exports that no application uses yet. Applications import them from the backend package and never depend on a Convex library directly, so every client runs the same Convex versions as the deployed functions. This is an exception to deleting vendor pass-throughs: keep the re-exports when an audit reports them as unused.

Use the `connect-backend` skill in `.agents/skills/` to add the client, environment, provider, and optional example connections to `apps/app`, `apps/desktop`, or `apps/mobile`. It does not deploy Convex or create credentials.

Run `bun run --filter @v1/backend dev` to connect the package to a Convex deployment.

### Structure

- `src/client/` — React client and auth adapters
- `src/functions/public/` — public queries and mutations
- `src/functions/system/` — operational functions such as health checks
- `src/functions/shared/` — middleware, auth, logging, and environment configuration
- `src/functions/_generated/` — generated API and data-model types

## Email

`packages/email` renders [React Email](https://react.email/) templates and delivers them through a transport. An application workspace creates one mailer in its composition root and passes it where email is sent:

```ts
import { createMailer } from "@v1/email/mailer"
import { selectTransport } from "@v1/email/transports"

export const mailer = createMailer({
  from: ENV.EMAIL_FROM,
  logger: log,
  transport: selectTransport({ resendApiKey: ENV.RESEND_API_KEY, smtpUrl: ENV.SMTP_URL }),
})

await mailer.send("password-reset", { appName, resetUrl }, { to: [user.email] })
```

Each template registers its subject in `src/registry.ts`, so `send` type-checks the template name and its props. `selectTransport` uses Resend when `RESEND_API_KEY` is set and SMTP otherwise. Locally, `SMTP_URL` points at Mailpit from Docker Compose, which keeps every message and shows it at http://localhost:8005.

`send` retries temporary failures, such as a dropped connection or a rate limit, with exponential backoff under one deadline. It reuses one idempotency key across the retries of a send, so Resend never delivers the same message twice. A failure that a retry cannot fix, such as an invalid sender, fails on the first attempt. `send` returns a failed delivery as a `SendEmailError` value instead of throwing, with the transport error as its `cause`. Pass `attempts` and `timeoutMs` to `createMailer` to change the policy.

## Database

`packages/database` owns the Drizzle schema, migrations, and helpers. An application workspace creates one client in its composition root and passes its logger to log queries at debug level:

```ts
import { createDatabase } from "@v1/database/client"

export const database = createDatabase({ logger: log, url: ENV.DATABASE_URL })
```

`withTransaction(database, operation)` from `@v1/database/helpers/transaction` runs an operation in a transaction, and nested calls reuse the active one.

## Payments

`packages/payments` wraps Stripe with a subscription cache. `createPayments({ secretKey, webhookSecret, storage })` takes any [unstorage](https://unstorage.unjs.io/) instance for the cache, such as the Redis instance that `apps/api` creates in its composition root. `parseWebhook` verifies a webhook request and returns its event, or an `InvalidWebhookError` value. `syncSubscription` caches the latest subscription from Stripe, and `getSubscription` reads the cache and falls back to Stripe on a miss.

## File Storage

`packages/storage` owns file storage on top of [Files SDK](https://github.com/haydenbleasel/files-sdk): the access policy, the authenticated gateway, and the React client. The policy covers accepted content types, upload size, URL lifetime, list limits, and key rules, and lives in `src/constants.ts` and `src/server.ts`. Treat a change to it as a security change and review it as one.

An application workspace that serves files creates one storage instance in its composition root:

```ts
import { createFileStorage, createS3Adapter } from "@v1/storage/server"

export const storage = createFileStorage({
  adapter: createS3Adapter({
    accessKeyId: ENV.S3_ACCESS_KEY_ID,
    bucket: ENV.S3_BUCKET,
    endpoint: ENV.S3_ENDPOINT,
    region: ENV.S3_REGION,
    secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
  }),
})
```

`createFileStorageRouter({ allowedOrigins, getKeyPrefix, secret, storage })` returns a router whose `handle(request)` serves the gateway. `apps/api` mounts it at `/files` behind its session middleware and scopes every key to `users/<id>/`. Locally, `S3_ENDPOINT` points at MinIO from Docker Compose. Tests pass `createMemoryAdapter()` instead of the S3 adapter.

A client application calls `createFileStorageClient({ endpoint })` from `@v1/storage/react` once in a `shared` module, passing the gateway URL from its own `ENV`, and exports the hooks it returns: `useFiles` for uploads, downloads, and deletes, and `useFile`, `useList`, and `useSearch` for reads. Requests to the gateway carry the session cookie. React Native file references need a native transport, which the package does not include.

## Key-Value Storage

There is no key-value package workspace. An application workspace that needs one creates an [unstorage](https://unstorage.unjs.io/) instance in its composition root. `apps/api` uses the Redis driver against Redis from Docker Compose and passes the instance to handlers as `c.var.kv`. Namespace keys per feature with unstorage's `prefixStorage`. Values must be JSON-serializable; dates come back as strings.

## Jobs

`packages/jobs` runs fire-and-forget background jobs on Redis through [BullMQ](https://docs.bullmq.io/). A dispatcher adds a job to a queue, and a worker in another process picks it up. Use a job for one unit of work that can run later and retry on its own, such as sending an email, resizing an upload, or calling a slow third-party API. Use a [workflow](#workflows) when the work has several steps whose progress must survive a crash, or when the caller waits for its result.

Each queue lives in its own file under `src/queues/` and owns its jobs. `defineQueue` sets the concurrency of each worker process that consumes the queue and an optional rate limit across every worker. `defineJob` declares a job's payload schema and, optionally, its attempts. A job's name is its key in `jobs`, so a queue cannot list the same name twice:

```ts
// src/queues/email.ts
export const emailQueue = defineQueue({
  concurrency: 5,
  limiter: { duration: 1000, max: 10 },
  jobs: {
    "send-welcome": defineJob({
      attempts: 5,
      payload: z.object({ email: z.email(), name: z.string() }),
    }),
    "send-digest": sendDigest,
  },
})
```

`src/catalog.ts` lists every queue, and a queue's name is its key there:

```ts
export const queues = { default: defaultQueue, email: emailQueue }
```

Write small jobs inline. When a queue grows large, declare each job with `defineJob` in its own file, such as `src/jobs/send-digest.ts`, and keep only the name-to-job entries in the queue file. The names stay in one object, so a duplicate is still a type error. Two queues can each have a job with the same name.

Any server-side application workspace can dispatch. Create one dispatcher in its composition root and close it on shutdown:

```ts
import { createDispatcher } from "@v1/jobs/dispatcher"

export const dispatcher = createDispatcher({ logger: log, url: ENV.JOBS_REDIS_URL })

await c.var.dispatcher.dispatch("default", "greet-user", { userId }, { id: `greet-${userId}` })
```

`dispatch` type-checks the queue, the job name on that queue, and its payload, and validates the payload before it reaches Redis. Dispatches with the same `id` add one job while BullMQ keeps it. Pass `delayMs` to run a job later. A failed dispatch comes back as a `DispatchJobError` or `JobPayloadError` value instead of throwing. While Redis is unreachable, a dispatch fails after one reconnect attempt instead of holding the request open.

`apps/worker` consumes queues. A worker takes handlers by queue and job, and consumes every queue it lists. It must handle every job on those queues, so adding a job to a queue fails type checking in each worker that consumes it until a handler exists:

```ts
import { createJobWorker } from "@v1/jobs/worker"

const worker = createJobWorker({
  handlers: {
    default: { "greet-user": greetUser },
    email: { "send-welcome": sendWelcome, "send-digest": sendDigest },
  },
  logger: log,
  url: ENV.JOBS_REDIS_URL,
})

await worker.run()
```

Run more than one worker process to share a queue; BullMQ hands each job to one of them. To isolate a slow or rate-limited queue, run a process whose handlers list only that queue. A job retries with exponential backoff until it runs out of attempts, so keep handlers idempotent. Each handler receives the payload and a context with the `attempt` number and the job `id`, which stays the same across attempts and works as an idempotency key for a third-party API. A job whose payload no longer matches its schema, or whose name the worker does not handle, fails without a retry. That happens when a dispatcher and a worker run different versions during a deploy, so change a payload schema in a way that accepts both shapes until every process runs the new version. BullMQ removes completed jobs after a day and failed jobs after a week. `worker.close()` waits for the jobs in progress before the process exits.

To inspect, retry, and remove jobs from a browser, add the `bull-board` template recipe. See [Project generators](./generators.md#add-a-jobs-dashboard).

Jobs need Redis with `maxmemory-policy noeviction`, so Redis never drops a queued job to free memory. `JOBS_REDIS_URL` is separate from `REDIS_URL` so a project can point key-value storage at a cache that evicts keys. Locally, both point at Redis from Docker Compose, which runs with `noeviction`.

## Workflows

`packages/workflows` runs durable background workflows through [DBOS](https://docs.dbos.dev/). DBOS stores workflow inputs, step outputs, and queues in a `dbos` schema in Postgres, so workflows need a Postgres database. It runs inside the application process: there is no separate workflow server, signing key, or hosted account.

An application workspace creates one `Workflows` instance per process. Pass a `url`, and workflows open their own small connection pool. Pass the application's logger as `logger` to receive workflow events; without it, DBOS logs to the console:

```ts
import { Workflows } from "@v1/workflows/client"

export const workflows = new Workflows({
  logger: log,
  poolSize: 5,
  queues: { default: { concurrency: 10 } },
  url: ENV.DATABASE_URL,
})
```

The separate pool keeps workflow traffic and request traffic from waiting on each other's connections. It adds `poolSize` connections to each process, and DBOS holds one of them open to listen for notifications. When a Postgres connection limit is tight, pass a `pg` `Pool` as `pool` instead, and workflows share it.

Define every workflow before `workflows.launch()`. Each `step` result is saved, so after a crash the workflow resumes from the first step that did not finish. A step can run more than once, so keep its side effects idempotent. `sleep` is durable across restarts.

```ts
export const greetUser = workflows.define("greetUser", async ({ userId }: { userId: string }) => {
  const greeting = await workflows.step("composeGreeting", () => `Hello, ${userId}`, {
    attempts: 3,
  })

  await workflows.sleep(1000)

  return { greeting }
})

await workflows.run(greetUser, { userId }, { id: `greet-${userId}`, queue: "default" })
```

Runs with the same `id` execute once. `queue` limits how many runs of that queue execute at once. Call `workflows.shutdown()` before the process exits.

Run workflows in a single process per application version. Every process uses the same DBOS executor ID, and on startup a process resumes every unfinished run of its version, including runs that another process is still executing. A second API instance, or a restart or deploy that starts the new process before the old one stops, can therefore execute the same steps twice. Stop the old process before the new one starts. Running several instances needs a distinct executor ID per process and a plan to recover the runs of a process that stops for good, such as [DBOS Conductor](https://docs.dbos.dev/production/conductor).

DBOS tags each run with an application version, which defaults to a hash of the workflow code, and recovers only runs that match the current version. After a deploy that changes workflow code, runs that the previous version left unfinished do not resume on their own. Keep a process on the previous version until they drain, or move them to the new version. See [Upgrading Workflow Code](https://docs.dbos.dev/typescript/tutorials/upgrading-workflows).

`bun run --filter @v1/workflows reset` drops the local `dbos` schema, which removes workflow runs, queues, and history. Resetting the database clears only the application tables, so reset workflows with it. Otherwise unfinished runs resume against the new data. Stop the API first. It recreates the schema the next time it launches.
