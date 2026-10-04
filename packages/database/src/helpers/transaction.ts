import { AsyncLocalStorage } from "node:async_hooks"
import type { Database } from "#client.ts"

export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0]

// The active transaction of each database in the current async scope.
const storage = new AsyncLocalStorage<ReadonlyMap<Database, DatabaseTransaction>>()

/**
 * Runs the operation inside a transaction. Nested calls on the same database reuse the active
 * transaction, so composed domain operations commit or roll back together. A call on another
 * database opens its own transaction.
 */
export async function withTransaction<T>(
  database: Database,
  operation: (transaction: DatabaseTransaction) => Promise<T>
) {
  const active = storage.getStore()
  const current = active?.get(database)

  if (current) {
    return operation(current)
  }

  return database.transaction((transaction) =>
    storage.run(new Map(active).set(database, transaction), () => operation(transaction))
  )
}
