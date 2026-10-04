import { createJobWorker } from "@v1/jobs/worker"
import { handleLifecycle } from "@v1/utils/lifecycle"
import { createWorkflowWorker } from "@v1/workflows/worker"
import * as try$ from "tryharder"
import { greetUser, welcomeUser } from "#features/demo/handlers.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { workflows } from "#shared/services.ts"

const jobWorker = createJobWorker({
  handlers: { default: { "greet-user": greetUser } },
  logger: log,
  url: ENV.JOBS_REDIS_URL,
})

const workflowWorker = createWorkflowWorker({
  functions: [welcomeUser],
  gatewayUrl: ENV.INNGEST_CONNECT_GATEWAY_URL,
  logger: log,
  workflows,
})

// Closing waits for the jobs and steps in progress. BullMQ retries a job that outlives the
// deadline as stalled once its lock expires, and Inngest retries the step.
const lifecycle = handleLifecycle({
  close: () => Promise.all([jobWorker.close(), workflowWorker.close()]),
  logger: log,
  scope: "worker",
})

workflowWorker.connect()

log.info({ message: "Worker started", scope: "worker" })

const result = await try$.run(() => jobWorker.run())

if (result instanceof Error) {
  log.error({ error: result, message: "Job worker stopped unexpectedly", scope: "jobs" })
  await lifecycle.stop(1)
}
