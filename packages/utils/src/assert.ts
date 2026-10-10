import * as Faultier from "faultier"

export class AssertUnreachableError extends Faultier.Tagged("AssertUnreachableError")<{
  value: string
}>() {}

export class AssertConditionFailedError extends Faultier.Tagged("AssertConditionFailedError")<{
  condition: string
}>() {}

export const AssertFault = Faultier.registry({
  AssertConditionFailedError,
  AssertUnreachableError,
})

/**
 * Asserts that a value is never, and throws an error if it is. Use this to make sure that all cases
 * in a `switch` statement are handled.
 */
export function assertUnreachable(value: never): never {
  throw new AssertUnreachableError({ value: String(value) })
}

export function throwUnless(condition: boolean, message: string): asserts condition is true {
  if (!condition) {
    throw new AssertConditionFailedError({ condition: "throwUnless" }).withMessage(message)
  }
}

export function throwIf(condition: boolean, message: string): asserts condition is false {
  if (condition) {
    throw new AssertConditionFailedError({ condition: "throwIf" }).withMessage(message)
  }
}
