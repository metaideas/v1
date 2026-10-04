import type { Logger } from "@v1/core/services/logging"
import type { InngestFunction } from "inngest"
import { connect as connectToInngest, type WorkerConnection } from "inngest/connect"
import * as try$ from "tryharder"
import type { Workflows } from "#client.ts"

export function createWorkflowWorker({
  functions,
  gatewayUrl,
  logger,
  workflows,
}: WorkflowWorkerOptions) {
  let connection: WorkerConnection | undefined
  let isClosed = false

  async function open() {
    const opened = await try$.run(() =>
      connectToInngest({
        apps: [{ client: workflows, functions }],
        gatewayUrl,
        // The application owns the process lifecycle and closes the connection on shutdown.
        handleShutdownSignals: [],
      })
    )

    if (opened instanceof Error) {
      logger?.error({ error: opened, message: "Workflows could not connect", scope: "workflows" })
      return
    }

    // `connect` resolves only once Inngest is reachable, which can be after `close`.
    if (isClosed) {
      await opened.close()
      return
    }

    connection = opened
  }

  return {
    /**
     * Connects to Inngest in the background over an outbound WebSocket, so Inngest needs no public
     * endpoint. It retries until Inngest is reachable, so the process starts without waiting.
     */
    connect() {
      void open()
    },

    /**
     * Stops taking steps and waits for the steps in progress to finish.
     */
    async close() {
      isClosed = true
      await connection?.close()
    },
  }
}

export type WorkflowWorker = ReturnType<typeof createWorkflowWorker>

type WorkflowWorkerOptions = {
  /**
   * Every function that the worker runs.
   */
  functions: InngestFunction.Like[]
  workflows: Workflows
  /**
   * The Connect gateway of a Dev Server or self-hosted server. Inngest Cloud is the default.
   */
  gatewayUrl?: string
  logger?: Logger
}
