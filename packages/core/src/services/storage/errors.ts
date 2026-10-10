import * as Faultier from "faultier"

/**
 * A storage operation succeeded, but the application could not record it. Storage and the record
 * are not atomic, so the storage result stands and the failure is only logged.
 */
export class StorageSyncError extends Faultier.Tagged("StorageSyncError")<{
  key: string
  operation: "delete" | "store"
}>() {}

export const StorageFault = Faultier.registry({ StorageSyncError })
