import * as Fault from "@sanely/errors"

export class UnauthenticatedError extends Fault.Tagged("UnauthenticatedError")() {}

export class UnauthorizedError extends Fault.Tagged("UnauthorizedError")<{
  userId: string
}>() {}

export class PasswordResetRequestError extends Fault.Tagged("PasswordResetRequestError")() {}

export const AuthFault = Fault.registry({
  PasswordResetRequestError,
  UnauthenticatedError,
  UnauthorizedError,
})
