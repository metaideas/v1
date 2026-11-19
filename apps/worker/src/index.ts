import { lifecycle } from "@v1/utils/lifecycle"
import { close, runners } from "#runners.ts"
import { log } from "#shared/logger.ts"

await lifecycle(
  () => {
    runners.workflows.connect()
    log.info({ message: "Worker started", scope: "worker" })

    return runners.jobs.run()
  },
  {
    close,
    onError: (error, message) => {
      log.error({ error, message, scope: "worker" })
    },
  }
)
