import { createJobWorker } from "@v1/jobs/worker"
import { connect, type WorkerConnection } from "inngest/connect"
import { greetUser, welcomeUser } from "#features/demo/handlers.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { workflows } from "#shared/services.ts"

const worker = createJobWorker({
  handlers: { default: { "greet-user": greetUser } },
  logger: log,
  url: ENV.JOBS_REDIS_URL,
})

// `connect` retries until Inngest is reachable, so jobs start without waiting for it.
let connection: WorkerConnection | undefined

async function connectWorkflows() {
  try {
    connection = await connect({
      apps: [{ client: workflows, functions: [welcomeUser] }],
      gatewayUrl: ENV.INNGEST_CONNECT_GATEWAY_URL,
      handleShutdownSignals: [],
    })
  } catch (error) {
    log.error({ error, message: "Workflows could not connect", scope: "workflows" })
  }
}

void connectWorkflows()

async function shutdown() {
  await Promise.all([worker.close(), connection?.close()])
  process.exit(0)
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown()
  })
}

log.info({ message: "Worker started", scope: "worker" })
await worker.run()
