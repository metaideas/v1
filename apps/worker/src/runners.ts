import { createJobsRunner } from "@v1/jobs/runner"
import { createWorkflowsRunner } from "@v1/workflows/runner"
import { greetUser, welcomeUser } from "#features/demo/handlers.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { services } from "#shared/services.ts"

export const runners = {
  jobs: createJobsRunner({
    handlers: { default: { "greet-user": greetUser } },
    logger: log,
    url: ENV.JOBS_REDIS_URL,
  }),
  workflows: createWorkflowsRunner({
    client: services.workflows,
    functions: [welcomeUser],
    gatewayUrl: ENV.INNGEST_CONNECT_GATEWAY_URL,
    logger: log,
  }),
}

/**
 * Stops taking work and waits for the jobs and steps in progress. BullMQ retries a job that
 * outlives the shutdown deadline as stalled once its lock expires, and Inngest retries the step.
 */
export async function close() {
  await Promise.all([runners.jobs.close(), runners.workflows.close()])
}
