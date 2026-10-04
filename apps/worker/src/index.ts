import { createJobWorker } from "@v1/jobs/worker"
import { connect, type WorkerConnection } from "inngest/connect"
import * as try$ from "tryharder"
import { greetUser, welcomeUser } from "#features/demo/handlers.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { workflows } from "#shared/services.ts"

// Keep it below the grace period that the platform allows between SIGTERM and SIGKILL.
const SHUTDOWN_TIMEOUT_MS = 25_000

const worker = createJobWorker({
  handlers: { default: { "greet-user": greetUser } },
  logger: log,
  url: ENV.JOBS_REDIS_URL,
})

// `connect` retries until Inngest is reachable, so jobs start without waiting for it.
let connection: WorkerConnection | undefined

async function connectWorkflows() {
  const connected = await try$.run(() =>
    connect({
      apps: [{ client: workflows, functions: [welcomeUser] }],
      gatewayUrl: ENV.INNGEST_CONNECT_GATEWAY_URL,
      handleShutdownSignals: [],
    })
  )

  if (connected instanceof Error) {
    log.error({ error: connected, message: "Workflows could not connect", scope: "workflows" })
    return
  }

  connection = connected
}

void connectWorkflows()

let isStopping = false

async function stop(exitCode: number) {
  if (isStopping) return
  isStopping = true

  // A job or step that never settles would keep the process alive. BullMQ retries the job as
  // stalled once its lock expires, and Inngest retries the step.
  const closed = await try$
    .timeout(SHUTDOWN_TIMEOUT_MS)
    .run(() => Promise.all([worker.close(), connection?.close()]))

  if (closed instanceof Error) {
    log.error({ error: closed, message: "Worker did not stop cleanly", scope: "worker" })
    process.exit(1)
  }

  process.exit(exitCode)
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void stop(0)
  })
}

// A rejection that a handler leaves unhandled does not affect the other jobs, so the worker keeps
// running.
process.on("unhandledRejection", (error) => {
  log.error({ error, message: "Unhandled promise rejection", scope: "worker" })
})

// After an uncaught exception the process state is unknown. The worker finishes its jobs and exits
// with a failure, so its supervisor starts a fresh process.
process.on("uncaughtException", (error) => {
  log.error({ error, message: "Uncaught exception", scope: "worker" })
  void stop(1)
})

log.info({ message: "Worker started", scope: "worker" })

const result = await try$.run(() => worker.run())

if (result instanceof Error) {
  log.error({ error: result, message: "Job worker stopped unexpectedly", scope: "jobs" })
  await stop(1)
}
