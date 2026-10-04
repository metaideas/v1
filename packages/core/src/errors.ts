import * as Faultier from "faultier"
import type { AuthenticationError } from "#domains/auth/errors.ts"
import type { EmailError } from "#services/email/errors.ts"
import type { JobsError } from "#services/jobs/errors.ts"
import type { PaymentsError } from "#services/payments/errors.ts"
import type { WorkflowsError } from "#services/workflows/errors.ts"
import type { UtilityError } from "#shared/errors.ts"

import { AuthFault } from "#domains/auth/errors.ts"
import { EmailFault } from "#services/email/errors.ts"
import { JobsFault } from "#services/jobs/errors.ts"
import { PaymentsFault } from "#services/payments/errors.ts"
import { WorkflowsFault } from "#services/workflows/errors.ts"
import { UtilityFault } from "#shared/errors.ts"

export const AppFault = Faultier.merge(
  AuthFault,
  EmailFault,
  JobsFault,
  PaymentsFault,
  UtilityFault,
  WorkflowsFault
)
export type AppError =
  | AuthenticationError
  | EmailError
  | JobsError
  | PaymentsError
  | UtilityError
  | WorkflowsError

export * from "#domains/auth/errors.ts"
export * from "#services/email/errors.ts"
export * from "#services/jobs/errors.ts"
export * from "#services/payments/errors.ts"
export * from "#services/workflows/errors.ts"
export * from "#shared/errors.ts"

export { matchTag, matchTags, Fault, isFault } from "faultier"
export type { SerializableFault } from "faultier/types"
