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

Packages do not import each other, apart from `@v1/core`, `@v1/utils`, and `@v1/ui`. `@v1/utils` imports no other workspace, which `bun run boundaries` checks. When a package needs another capability, it declares the smallest interface it needs, such as `sendPasswordReset` above, and the application connects the two. `bun template doctor` reports a package that depends on another capability package or reads `ENV` in its source.

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

Clients transfer bytes directly with the bucket. A keyless upload sends the file to a signed POST policy that caps its size, and a download redirects to a signed URL, so file bytes never pass through the application. Storage cannot inspect bytes it never receives, so it enforces the key rules, the size cap in the signed policy, and the allowed types: a signed upload must declare an allowed type, which the signed policy pins, and a stored file of a disallowed type is deleted when its upload completes. It does not check file contents against their declared type. An upload that a client never completes stays in the bucket without a record, so give the bucket a lifecycle rule that expires stray objects.

An application workspace that serves files creates one storage instance in its composition root:

```ts
import { createUploadStorage, createS3Adapter } from "@v1/storage/server"

export const storage = createUploadStorage({
  adapter: createS3Adapter({
    accessKeyId: ENV.S3_ACCESS_KEY_ID,
    bucket: ENV.S3_BUCKET,
    endpoint: ENV.S3_ENDPOINT,
    region: ENV.S3_REGION,
    secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
  }),
  logger: log,
  onUploadDeleted: deleteUpload,
  onUploadStored: upsertUpload,
})
```

`onUploadStored` and `onUploadDeleted` keep application records in sync with storage. `createUploadStorage` calls `onUploadStored` after an upload or `head` succeeds and `onUploadDeleted` once for each deleted key, including each key of a bulk delete. The operation waits for the callback. Storage and the record are not atomic, so a failed callback is logged through `logger` as a `StorageSyncError` and the storage result stands. `apps/api` uses these callbacks to keep the `uploads` table current.

`createUploadStorageRouter({ allowedOrigins, getKeyPrefix, secret, storage })` returns a router whose `handle(request)` serves the gateway. `apps/api` mounts it at `/files` and scopes every key to `users/<id>/`. The gateway authenticates with an access token instead of the session cookie: clients on other origins cannot send the HttpOnly cookie without credentialed requests, and a credentialed download would fail at the bucket's CORS check after the redirect. `createAccessTokenPlugin()` from `@v1/auth/server` issues five-minute JWTs at `/auth/token` and stores their signing keys in the `jwks` table, and the gateway checks each token with `auth.api.verifyJWT`. Locally, `S3_ENDPOINT` points at MinIO from Docker Compose. Tests pass `createMemoryAdapter()` instead of the S3 adapter.

A client application calls `createUploadStorageClient` from `@v1/storage/react` once in a `shared` module, passing the gateway URL from its own `ENV` and a function that fetches an access token from its auth client, and exports the hooks it returns: `useUpload` for uploads, downloads, and deletes, and `useFile`, `useList`, and `useSearch` for reads. The client fetches a fresh token for every gateway call and sends it only to the gateway. It never reuses a token, because Better Auth can change the session, such as after a sign-out in another tab, without telling the client, and a reused token would act as the previous account.

```ts
import { createUploadStorageClient } from "@v1/storage/react"

export const { useFile, useList, useSearch, useUpload } = createUploadStorageClient({
  endpoint: buildApiUrl("/files"),
  getToken: async () => {
    const { data, error } = await authClient.token()
    if (error) throw new Error(error.message)
    return data.token
  },
})
```

## Key-Value Storage

There is no key-value package workspace. An application workspace that needs one creates an [unstorage](https://unstorage.unjs.io/) instance in its composition root. `apps/api` uses the Redis driver against Redis from Docker Compose and passes the instance to handlers as `c.var.kv`. Namespace keys per feature with unstorage's `prefixStorage`. Values must be JSON-serializable; dates come back as strings.

## Jobs

`packages/jobs` runs fire-and-forget background jobs on Redis through [BullMQ](https://docs.bullmq.io/). A dispatcher adds a job to a queue, and a jobs runner in another process, such as `apps/worker`, picks it up. Use a job for one unit of work that can run later and retry on its own, such as sending an email, resizing an upload, or calling a slow third-party API. Use a [workflow](#workflows) when the work has several steps whose progress must survive a crash, or waits between them.

Each queue lives in its own file under `src/queues/` and owns its jobs. `defineQueue` sets the concurrency of each runner that consumes the queue and an optional rate limit across every runner. `defineJob` declares a job's payload schema and, optionally, its attempts. A job's name is its key in `jobs`, so a queue cannot list the same name twice:

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

`apps/worker` consumes queues with a jobs runner. A runner takes handlers by queue and job, and consumes every queue it lists. It must handle every job on those queues, so adding a job to a queue fails type checking in each runner that consumes it until a handler exists:

```ts
import { createJobsRunner } from "@v1/jobs/runner"

const jobs = createJobsRunner({
  handlers: {
    default: { "greet-user": greetUser },
    email: { "send-welcome": sendWelcome, "send-digest": sendDigest },
  },
  logger: log,
  url: ENV.JOBS_REDIS_URL,
})

await jobs.run()
```

Run more than one worker process to share a queue; BullMQ hands each job to one of them. To isolate a slow or rate-limited queue, run a process whose handlers list only that queue. A job retries with exponential backoff until it runs out of attempts, so keep handlers idempotent. Each handler receives the payload and a context with the `attempt` number and the job `id`, which stays the same across attempts and works as an idempotency key for a third-party API. A job whose payload no longer matches its schema, or whose name the runner does not handle, fails without a retry. That happens when a dispatcher and a runner run different versions during a deploy, so change a payload schema in a way that accepts both shapes until every process runs the new version. BullMQ removes completed jobs after a day and failed jobs after a week. `jobs.close()` waits for the jobs in progress before the process exits.

Run the worker under a supervisor that restarts it when it exits, such as a container restart policy or a platform that restarts crashed services. On `SIGTERM` or `SIGINT`, the worker stops taking jobs, waits up to 25 seconds for the jobs and workflow steps in progress, and exits; set the platform's stop grace period longer than that, and pass a longer `timeoutMs` to `lifecycle` in `apps/worker/src/index.ts` when jobs need more time. The worker logs an unhandled promise rejection and keeps running. After an uncaught exception, it finishes its jobs the same way and exits with code 1. When a worker dies without finishing a job, BullMQ holds the job's lock for 30 seconds, then a running worker logs the job as stalled and runs it again. A job that stalls a second time fails, so a job that crashes every worker cannot crash them forever. Keep each handler from blocking the event loop for that long: a worker that cannot renew its lock loses the job to another worker while it still runs.

To inspect, retry, and remove jobs from a browser, add the `bull-board` template recipe. See [Project generators](./generators.md#add-a-jobs-dashboard).

Jobs need Redis with `maxmemory-policy noeviction`, so Redis never drops a queued job to free memory. `JOBS_REDIS_URL` is separate from `REDIS_URL` so a project can point key-value storage at a cache that evicts keys. Locally, both point at Redis from Docker Compose, which runs with `noeviction`.

## Workflows

`packages/workflows` runs durable background workflows through [Inngest](https://www.inngest.com/docs). An application sends an event, and Inngest runs every function that the event triggers. `apps/worker` runs the functions. Inngest saves the result of each step, so a run that fails or restarts resumes after the last step that finished.

Locally, Docker Compose runs the Inngest Dev Server. Its dashboard at `http://localhost:8006` shows events, runs, and steps. It needs no account or real keys, and it keeps runs in memory, so they disappear when the container restarts. In production, use Inngest Cloud with the event and signing keys from its dashboard, or self-host the server with `inngest start` and point `INNGEST_BASE_URL` at it. A self-hosted server needs a hex signing key.

Each domain declares its events in its own file under `src/events/`, with each event's name and payload schema. Senders and functions import the same declaration, so a payload is type-checked where it is sent and where it is handled. An event's name is `<domain>/<noun>.<verb>`, with the verb in the past tense, and its path in the object matches the name, so the Inngest dashboard shows what the code says. A segment of several words uses camelCase in both places:

```ts
// src/events/billing.ts
export const billing = {
  invoice: {
    paid: eventType("billing/invoice.paid", { schema: InvoiceSchema }),
    paymentFailed: eventType("billing/invoice.paymentFailed", { schema: InvoiceSchema }),
  },
}
```

`src/events/index.ts` collects the domains into one `events` object. Import that object rather than each domain, because domain names such as `auth` and `files` collide with service names in application workspaces:

```ts
export const events = { billing, demo }
```

Each application workspace that sends events or runs functions creates one client in its composition root. Its `id` names the application in Inngest:

```ts
import { createWorkflows } from "@v1/workflows/client"

export const workflows = createWorkflows({
  baseUrl: ENV.INNGEST_BASE_URL,
  eventKey: ENV.INNGEST_EVENT_KEY,
  id: "api",
  isDev: ENV.INNGEST_DEV,
  logger: log,
  signingKey: ENV.INNGEST_SIGNING_KEY,
  signingKeyFallback: ENV.INNGEST_SIGNING_KEY_FALLBACK,
})

await c.var.workflows.send(
  events.demo.welcome.requested.create({ userId }, { id: `welcome-${userId}` })
)
```

`send` validates the payload and returns the event IDs. Events with the same `id` trigger functions once within 24 hours. Unlike a job dispatch, a failed send throws.

Functions live in the `handlers.ts` of a worker feature. Wrap each side effect in `step.run`. Inngest calls the function again for each step and returns saved results for the steps that already finished, so code outside a step runs more than once. A step can also run more than once, so keep its side effects idempotent. `step.sleep` waits without holding the worker. The options of `createFunction` set retries and flow control, such as `concurrency`, `throttle`, `rateLimit`, and `debounce`:

```ts
export const welcomeUser = workflows.createFunction(
  { concurrency: { limit: 10 }, id: "welcome-user", triggers: [events.demo.welcome.requested] },
  async ({ event, logger, step }) => {
    const message = await step.run("compose-welcome", () => `Welcome, ${event.data.userId}`)

    await step.sleep("pause", "1s")

    await step.run("deliver-welcome", () => {
      logger.info({ userId: event.data.userId }, message)
    })

    return { message }
  }
)
```

`createWorkflowsRunner` from `@v1/workflows/runner` opens a WebSocket to Inngest with [Connect](https://www.inngest.com/docs/setup/connect), so Inngest reaches the functions without a public endpoint. Pass the client from `createWorkflows` as `client`, and list every function in `functions`:

```ts
import { createWorkflowsRunner } from "@v1/workflows/runner"

const workflows = createWorkflowsRunner({
  client: workflowsClient,
  functions: [welcomeUser],
  gatewayUrl: ENV.INNGEST_CONNECT_GATEWAY_URL,
  logger: log,
})

workflows.connect()
```

`connect()` returns at once and retries in the background until Inngest is reachable, so jobs run in the meantime. `close()` lets the steps in progress finish. Run more than one worker process to share the load; Inngest sends each step to one of them. Inngest Cloud plans limit how many workers connect at once.

Inngest Cloud bills every run and every step. Jobs run on Redis that the project already operates, so use a job for high-volume work that needs no steps.
