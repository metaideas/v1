import type { AssertError } from "@v1/utils/assert"
import * as Faultier from "faultier"
import type { AuthenticationError } from "#domains/auth/errors.ts"
import type { EmailError } from "#services/email/errors.ts"
import type { JobsError } from "#services/jobs/errors.ts"
import type { PaymentsError } from "#services/payments/errors.ts"
import type { StorageError } from "#services/storage/errors.ts"

import { AssertFault } from "@v1/utils/assert"
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
export type AppError =
  | AuthenticationError
  | EmailError
  | JobsError
  | PaymentsError
  | StorageError
  | AssertError

export * from "#domains/auth/errors.ts"
export * from "#services/email/errors.ts"
export * from "#services/jobs/errors.ts"
export * from "#services/payments/errors.ts"
export * from "#services/storage/errors.ts"

export { matchTag, matchTags, Fault, isFault } from "faultier"
export type { SerializableFault } from "faultier/types"
