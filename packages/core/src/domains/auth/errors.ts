import * as Faultier from "faultier"

export class UnauthenticatedError extends Faultier.Tagged("UnauthenticatedError")() {}

export class UnauthorizedError extends Faultier.Tagged("UnauthorizedError")<{
  userId: string
}>() {}

export class PasswordResetRequestError extends Faultier.Tagged("PasswordResetRequestError")() {}
export const AuthFault = Faultier.registry({
  PasswordResetRequestError,
  UnauthenticatedError,
  UnauthorizedError,
})
