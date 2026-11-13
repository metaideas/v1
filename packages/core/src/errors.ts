import { merge } from "@sanely/errors"
import { AssertFault } from "@v1/utils/assert"
import { AuthFault } from "#domains/auth/errors.ts"

export const AppFault = merge(AuthFault, AssertFault)
export type AppError = typeof AppFault.Type

export * from "#domains/auth/errors.ts"

export { Base as Fault, isFault, matchTag, matchTags } from "@sanely/errors"
export type { SerializableFault } from "@sanely/errors/types"
