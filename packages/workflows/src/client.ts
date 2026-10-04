import type { AnyWorkflowDefinition, WorkflowInput } from "@tanstack/workflow-core"
import type { Logger } from "@v1/core/services/logging"
import {
  defineWorkflowRuntime,
  materializeWorkflowSchedules,
  type WorkflowExecution,
  type WorkflowRegistration,
  type WorkflowRegistrationMap,
  type WorkflowRuntimeDefinition,
} from "@tanstack/workflow-runtime"
import {
  createDrizzlePostgresWorkflowStore,
  type DrizzlePostgresDatabase,
} from "@tanstack/workflow-store-drizzle-postgres"
import { WorkflowsFault } from "@v1/core/errors"

export function createWorkflows({ db, logger, sweepIntervalMs = 1000 }: WorkflowsOptions) {
  const store = createDrizzlePostgresWorkflowStore({ db })
  const registrations: WorkflowRegistrationMap = {}
  const leaseOwner = `workflows:${crypto.randomUUID()}`
  let runtime: WorkflowRuntimeDefinition | undefined
  let sweeping: Promise<void> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let isStopping = false

  // Sleeps and schedules resume only when a sweep claims their timers.
  function scheduleSweep(launched: WorkflowRuntimeDefinition, delayMs: number) {
    timer = setTimeout(() => {
      sweeping = sweep(launched)
    }, delayMs)
  }

  async function sweep(launched: WorkflowRuntimeDefinition) {
    let remainingMayExist = false

    try {
      await materializeWorkflowSchedules(launched)
      ;({ remainingMayExist } = await launched.sweep({
        includeEvents: false,
        leaseOwner,
        maxDurationMs: 10_000,
      }))
    } catch (error) {
      logger?.error({ error, scope: "workflows" })
    }

    if (!isStopping) {
      scheduleSweep(launched, remainingMayExist ? 0 : sweepIntervalMs)
    }
  }

  return {
    define<Workflow extends AnyWorkflowDefinition>(
      workflow: Workflow,
      { schedules }: DefineOptions = {}
    ): Workflow {
      if (runtime) {
        throw WorkflowsFault.create("WorkflowDefinedAfterLaunchError", {
          workflow: workflow.id,
        }).withMessage(`Workflow "${workflow.id}" must be defined before workflows launch`)
      }

      registrations[workflow.id] = {
        load: () => Promise.resolve(workflow),
        previousVersions: Object.fromEntries(
          (workflow.previousVersions ?? []).map((previous) => [
            previous.version,
            () => Promise.resolve(previous),
          ])
        ),
        schedules,
        version: workflow.version,
      }

      return workflow
    },

    run<Workflow extends AnyWorkflowDefinition>(
      workflow: Workflow,
      input: WorkflowInput<Workflow>,
      { id = crypto.randomUUID() }: RunOptions = {}
    ): WorkflowRun {
      if (!runtime) {
        throw WorkflowsFault.create("WorkflowsNotLaunchedError").withMessage(
          "Workflows must launch before a workflow can run"
        )
      }

      // The engine reads an undefined input as a resume and leaves the new run stuck, so send null.
      const payload: unknown = input

      // startRun drives the run until it finishes or pauses, so the caller does not wait on it.
      void runtime
        .startRun({
          includeEvents: false,
          input: payload ?? null,
          leaseOwner,
          runId: id,
          workflowId: workflow.id,
        })
        .catch((error: unknown) => {
          logger?.error({ error, runId: id, scope: "workflows", workflow: workflow.id })
        })

      return { id }
    },

    get(id: string): Promise<WorkflowExecution | undefined> {
      return store.loadRun(id)
    },

    launch() {
      runtime = defineWorkflowRuntime({ store, workflows: registrations })
      scheduleSweep(runtime, 0)
    },

    async shutdown() {
      isStopping = true
      clearTimeout(timer)
      await sweeping
    },
  }
}

type WorkflowsOptions = { db: DrizzlePostgresDatabase; logger?: Logger; sweepIntervalMs?: number }

type DefineOptions = Pick<WorkflowRegistration, "schedules">

type RunOptions = { id?: string }

export type Workflows = ReturnType<typeof createWorkflows>

export type WorkflowRun = { id: string }
