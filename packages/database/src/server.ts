import type { Logger } from "@v1/core/services/logging"
import { AsyncLocalStorage } from "node:async_hooks"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { relations } from "#relations.ts"

export function createDatabase({ logger, url }: { url: string; logger?: Logger }) {
  const client = postgres(url)
  const database = drizzle({
    client,
    logger: logger
      ? {
          // Bound parameters carry values such as session tokens and password hashes, which
          // field-name redaction cannot recognize, so only the parameterized query is logged.
          logQuery(query) {
            logger.debug({ query, scope: "drizzle" })
          },
        }
      : false,
    relations,
  })

  type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0]
  // Work started inside a transaction can outlive it, so the scope forgets the transaction once the
  // outer call settles, and a later call opens its own.
  type Scope = { transaction: Transaction | undefined }

  const scope = new AsyncLocalStorage<Scope>()

  return Object.assign(database, {
    /**
     * Waits for the queries in progress, then closes every connection in the pool.
     */
    close: () => client.end(),
    /**
     * Runs the operation in a transaction. A call inside another call on this database reuses its
     * transaction, so composed operations commit or roll back together. Concurrent calls each get
     * their own transaction.
     */
    withTransaction: async <T>(operation: (transaction: Transaction) => Promise<T>) => {
      const current = scope.getStore()?.transaction

      if (current) return operation(current)

      return database.transaction(async (transaction) => {
        const opened: Scope = { transaction }

        try {
          return await scope.run(opened, () => operation(transaction))
        } finally {
          opened.transaction = undefined
        }
      })
    },
  })
}

export function checkIsLocalDatabase(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1")
}

export type Database = ReturnType<typeof createDatabase>
