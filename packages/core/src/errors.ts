import { AssertFault } from "@v1/utils/assert"
import * as Faultier from "faultier"
import { AuthFault } from "#domains/auth/errors.ts"
import { EmailFault } from "#services/email/errors.ts"
import { JobsFault } from "#services/jobs/errors.ts"
import { PaymentsFault } from "#services/payments/errors.ts"
import { StorageFault } from "#services/storage/errors.ts"

export const AppFault = Faultier.merge(
  AuthFault,
  EmailFault,
  JobsFault,
  PaymentsFault,
  StorageFault,
  AssertFault
)
export type AppError = typeof AppFault.Type

export * from "#domains/auth/errors.ts"
export * from "#services/email/errors.ts"
export * from "#services/jobs/errors.ts"
export * from "#services/payments/errors.ts"
export * from "#services/storage/errors.ts"

export { matchTag, matchTags, Fault, isFault } from "faultier"
export type { SerializableFault } from "faultier/types"
