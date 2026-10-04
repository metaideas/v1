import { createJobWorker } from "@v1/jobs/worker"
import { greetUser } from "#features/demo/handlers.ts"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"

const worker = createJobWorker({
  handlers: { default: { "greet-user": greetUser } },
  logger: log,
  url: ENV.JOBS_REDIS_URL,
})

async function shutdown() {
  await worker.close()
  process.exit(0)
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown()
  })
}

log.info({ message: "Job worker started", scope: "jobs" })
await worker.run()
