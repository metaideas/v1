import type { AnyFieldLikeMetaBase } from "@tanstack/react-form-start"
import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { PasswordResetRequestError } from "@v1/core/domains/auth"
import * as z from "@v1/utils/schema/mini"
import { AUTHENTICATED_PATHNAME } from "#features/auth/constants.ts"
import { EmailSchema, SignInWithPasswordFormSchema } from "#features/auth/schemas.ts"
import { authClient } from "#shared/auth.ts"
import { createServerAuthClient } from "#shared/server/auth.ts"
import { publicFunction } from "#shared/server/functions.ts"
import { buildUrl } from "#shared/utils.ts"

/**
 * Form state for a rejected native submission, shaped for TanStack Form's `mergeForm`. It keeps the
 * email so the page can render it again, and never the password.
 */
export type SignInFormState = {
  errorMap: { onServer?: string }
  fieldMetaBase?: Record<string, AnyFieldLikeMetaBase>
  values: { email: string; password: string }
}

// Request headers the auth server uses for its origin check, cookies, and session metadata.
const FORWARDED_HEADERS = [
  "cookie",
  "origin",
  "referer",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "user-agent",
] as const

function pickHeaders(headers: Headers, names: readonly string[]) {
  const picked = new Headers()

  for (const name of names) {
    const value = headers.get(name)

    if (value !== null) {
      picked.set(name, value)
    }
  }

  return picked
}

export const validateSession = createIsomorphicFn()
  .client(async () => {
    const { data: session } = await authClient.getSession()
    return session
  })
  .server(async () => {
    const { data: session } = await createServerAuthClient().getSession({
      fetchOptions: { headers: pickHeaders(getRequestHeaders(), FORWARDED_HEADERS) },
    })
    return session
  })

export const forgotPassword = publicFunction
  .validator(z.object({ email: EmailSchema }))
  .handler(async ({ data }) => {
    const { error } = await createServerAuthClient().requestPasswordReset({
      email: data.email,
      fetchOptions: { headers: pickHeaders(getRequestHeaders(), FORWARDED_HEADERS) },
      redirectTo: buildUrl("/reset-password"),
    })

    if (error) {
      throw new PasswordResetRequestError().withMessage(
        error.message ?? "Unable to request a password reset"
      )
    }
    return { success: true }
  })

/**
 * Signs in from a native form submission. Returns a redirect on success, or the form state to
 * render the page again with errors.
 */
export async function signInWithPasswordForm(
  request: Request
): Promise<{ response: Response } | { formState: SignInFormState }> {
  const formData = await request.formData()
  const email = formData.get("email")
  const values = { email: typeof email === "string" ? email : "", password: "" }
  const result = SignInWithPasswordFormSchema.safeParse(Object.fromEntries(formData))

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    // Rejected fields are marked touched so the form renders them as invalid.
    const fieldMetaBase = Object.fromEntries(
      Object.entries(fieldErrors).map(([field, messages]) => [
        field,
        {
          _arrayVersion: 0,
          _pendingValidationsCount: 0,
          errorMap: { onServer: messages.map((message) => ({ message })) },
          errorSourceMap: { onServer: "form" },
          isBlurred: true,
          isDirty: true,
          isTouched: true,
          isValidating: false,
        } satisfies AnyFieldLikeMetaBase,
      ])
    )

    return { formState: { errorMap: {}, fieldMetaBase, values } }
  }

  let setCookies: string[] = []
  const { error } = await createServerAuthClient().signIn.email({
    ...result.data,
    fetchOptions: {
      headers: pickHeaders(request.headers, FORWARDED_HEADERS),
      onResponse: ({ response }) => {
        setCookies = response.headers.getSetCookie()
      },
    },
  })

  if (error) {
    return {
      formState: { errorMap: { onServer: error.message ?? "Unable to sign in" }, values },
    }
  }

  const response = new Response(null, {
    headers: { Location: AUTHENTICATED_PATHNAME },
    status: 303,
  })

  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie)
  }

  return { response }
}
