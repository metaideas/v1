import { createJobsRunner } from "@v1/jobs/runner"
import { lifecycle } from "@v1/utils/lifecycle"
import { createWorkflowsRunner } from "@v1/workflows/runner"
import { greetUser, welcomeUser } from "#features/demo/handlers.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { workflows as workflowsClient } from "#shared/services.ts"

const jobs = createJobsRunner({
  handlers: { default: { "greet-user": greetUser } },
  logger: log,
  url: ENV.JOBS_REDIS_URL,
})

const workflows = createWorkflowsRunner({
  client: workflowsClient,
  functions: [welcomeUser],
  gatewayUrl: ENV.INNGEST_CONNECT_GATEWAY_URL,
  logger: log,
})

await lifecycle(
  () => {
    workflows.connect()
    log.info({ message: "Worker started", scope: "worker" })

    return jobs.run()
  },
  {
    // Closing waits for the jobs and steps in progress. BullMQ retries a job that outlives the
    // deadline as stalled once its lock expires, and Inngest retries the step.
    close: () => Promise.all([jobs.close(), workflows.close()]),
    logger: log,
    scope: "worker",
  }
)
