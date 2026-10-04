import * as z from "@v1/utils/schema/mini"

export const EmailSchema = z.email({
  error: (issue) => (issue.input === undefined ? "Email is required" : "Invalid email address"),
})

export const PasswordSchema = z
  .string({ error: "Password is required" })
  .check(
    z.minLength(1, { error: "Password is required" }),
    z.minLength(8, { error: "Password must be more than 8 characters" }),
    z.maxLength(32, { error: "Password must be less than 32 characters" })
  )

export const NameSchema = z
  .string({ error: "Name is required" })
  .check(z.minLength(1, { error: "Name is required" }))

export const SignUpFormSchema = z.object({
  confirmPassword: PasswordSchema,
  email: EmailSchema,
  name: NameSchema,
  password: PasswordSchema,
})

export const SignInWithPasswordFormSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
})
export const ForgotPasswordFormSchema = z.object({
  email: EmailSchema,
})

export const ResetPasswordFormSchema = z
  .object({
    confirmPassword: PasswordSchema,
    password: PasswordSchema,
  })
  .check(
    z.refine((data) => data.password === data.confirmPassword, {
      error: "Passwords don't match",
      path: ["confirmPassword"],
    })
  )

export const ResetPasswordSearchSchema = z.object({
  token: z.optional(z.string()),
})
