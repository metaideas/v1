import type { Logger } from "@v1/core/services/logging"
import {
  type ContextualMetadata,
  DBOS,
  type DBOSConfig,
  type DLogger,
  type StackTrace,
} from "@dbos-inc/dbos-sdk"
import { WorkflowsFault } from "@v1/core/errors"

type LogMetadata = ContextualMetadata & StackTrace

type Pool = NonNullable<DBOSConfig["systemDatabasePool"]>

type QueueOptions = { concurrency?: number }

type WorkflowsOptions<Queue extends string> = (
  | { pool: Pool }
  | { url: string; poolSize?: number }
) & {
  logger?: Logger
  name?: string
  queues?: Record<Queue, QueueOptions>
}

type StepOptions = {
  attempts?: number
  backoff?: number
  delaySeconds?: number
  timeoutMs?: number
}

type RunOptions<Queue extends string> = { id?: string; queue?: Queue }

export type WorkflowRun<Result> = { id: string; result: () => Promise<Result> }

// DBOS passes errors and stacks in metadata, and the running workflow as a span.
function toEvent(entry: unknown, metadata?: LogMetadata) {
  const event: Record<string, unknown> =
    typeof entry === "string" ? { message: entry } : { details: entry }

  if (metadata?.error) {
    event.error = metadata.error
  } else if (metadata?.stack) {
    event.stack = metadata.stack
  }

  if (metadata?.span) {
    event.workflow = metadata.span.attributes
  }

  return { scope: "workflows", ...event }
}

function toWorkflowLogger(log: Logger): DLogger {
  return {
    debug: (entry, metadata) => {
      log.debug(toEvent(entry, metadata))
    },
    error: (entry, metadata) => {
      log.error(toEvent(entry, metadata))
    },
    info: (entry, metadata) => {
      log.info(toEvent(entry, metadata))
    },
    warn: (entry, metadata) => {
      log.warn(toEvent(entry, metadata))
    },
  }
}

export class Workflows<Queue extends string = never> {
  static #isCreated = false

  readonly #dbos = DBOS
  readonly #queues: Record<string, QueueOptions>
  #isLaunched = false

  constructor(options: WorkflowsOptions<Queue>) {
    if (Workflows.#isCreated) {
      throw WorkflowsFault.create("WorkflowsAlreadyCreatedError").withMessage(
        "Workflows can only be created once per process"
      )
    }

    Workflows.#isCreated = true
    this.#queues = options.queues ?? {}

    this.#dbos.setConfig({
      ...(options.logger ? { logger: toWorkflowLogger(options.logger) } : {}),
      name: options.name ?? "v1",
      ...("pool" in options
        ? { systemDatabasePool: options.pool }
        : { systemDatabasePoolSize: options.poolSize, systemDatabaseUrl: options.url }),
    })
  }

  define<Input, Result>(name: string, handler: (input: Input) => Promise<Result>) {
    if (this.#isLaunched) {
      throw WorkflowsFault.create("WorkflowDefinedAfterLaunchError", {
        workflow: name,
      }).withMessage(`Workflow "${name}" must be defined before workflows launch`)
    }

    return this.#dbos.registerWorkflow(handler, { name })
  }

  step<Result>(
    name: string,
    operation: () => Result | Promise<Result>,
    options: StepOptions = {}
  ): Promise<Result> {
    const { attempts = 1, backoff, delaySeconds, timeoutMs } = options

    return this.#dbos.runStep(async () => operation(), {
      backoffRate: backoff,
      intervalSeconds: delaySeconds,
      maxAttempts: attempts,
      name,
      retriesAllowed: attempts > 1,
      timeoutMS: timeoutMs,
    })
  }

  sleep(milliseconds: number) {
    return this.#dbos.sleep(milliseconds)
  }

  async run<Input, Result>(
    workflow: (input: Input) => Promise<Result>,
    input: Input,
    { id, queue }: RunOptions<Queue> = {}
  ): Promise<WorkflowRun<Result>> {
    if (!this.#isLaunched) {
      throw WorkflowsFault.create("WorkflowsNotLaunchedError").withMessage(
        "Workflows must launch before a workflow can run"
      )
    }

    const handle = await this.#dbos.startWorkflow(workflow, { queueName: queue, workflowID: id })(
      input
    )

    return { id: handle.workflowID, result: () => handle.getResult() }
  }

  async launch() {
    await this.#dbos.launch()
    this.#isLaunched = true

    await Promise.all(
      Object.entries(this.#queues).map(([name, { concurrency }]) =>
        this.#dbos.registerQueue(name, { globalConcurrency: concurrency })
      )
    )
  }

  async shutdown() {
    if (!this.#isLaunched) {
      return
    }

    await this.#dbos.shutdown()
    this.#isLaunched = false
  }
}
