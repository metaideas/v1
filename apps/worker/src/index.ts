import { createJobWorker } from "@v1/jobs/worker"
import { lifecycle } from "@v1/utils/lifecycle"
import { createWorkflowWorker } from "@v1/workflows/worker"
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

await lifecycle(
  () => {
    workflowWorker.connect()
    log.info({ message: "Worker started", scope: "worker" })

    return jobWorker.run()
  },
  {
    // Closing waits for the jobs and steps in progress. BullMQ retries a job that outlives the
    // deadline as stalled once its lock expires, and Inngest retries the step.
    close: () => Promise.all([jobWorker.close(), workflowWorker.close()]),
    logger: log,
    scope: "worker",
  }
)
