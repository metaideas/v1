import { merge } from "@sanely/errors"
import { AssertFault } from "@v1/utils/assert"
import { AuthFault } from "#domains/auth/errors.ts"
import { EmailFault } from "#services/email/errors.ts"
import { JobsFault } from "#services/jobs/errors.ts"
import { PaymentsFault } from "#services/payments/errors.ts"
import { RealtimeFault } from "#services/realtime/errors.ts"
import { StorageFault } from "#services/storage/errors.ts"

export const AppFault = merge(
  AuthFault,
  EmailFault,
  JobsFault,
  PaymentsFault,
  RealtimeFault,
  StorageFault,
  AssertFault
)
export type AppError = typeof AppFault.Type

export * from "#domains/auth/errors.ts"
export * from "#services/email/errors.ts"
export * from "#services/jobs/errors.ts"
export * from "#services/payments/errors.ts"
export * from "#services/realtime/errors.ts"
export * from "#services/storage/errors.ts"

export { Base as Fault, isFault, matchTag, matchTags } from "@sanely/errors"
export type { SerializableFault } from "@sanely/errors/types"
