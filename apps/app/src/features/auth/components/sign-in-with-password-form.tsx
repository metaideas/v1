import { mergeForm, useTransform } from "@tanstack/react-form-start"
import { Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@v1/ui/components/button"
import { FieldGroup } from "@v1/ui/components/field"
import { useForm } from "@v1/ui/components/form"
import { toast } from "@v1/ui/components/toast"
import type { SignInFormState } from "#features/auth/handlers.ts"
import { AUTHENTICATED_PATHNAME } from "#features/auth/constants.ts"
import {
  EmailSchema,
  PasswordSchema,
  SignInWithPasswordFormSchema,
} from "#features/auth/schemas.ts"
import { signIn } from "#shared/auth.ts"

/**
 * Posts natively to the sign-in route until hydration. After that, it validates and signs in on the
 * client. `state` holds the errors from a rejected native submission.
 */
export default function SignInWithPasswordForm({ state }: { state: SignInFormState | null }) {
  const navigate = useNavigate()
  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      await signIn.email(
        { email: value.email, password: value.password },
        {
          onError: (error) => {
            toast.add({ title: error.error.message, type: "error" })
          },
          onSuccess: () => {
            void navigate({ to: AUTHENTICATED_PATHNAME })
          },
        }
      )
    },
    transform: useTransform((baseForm) => (state ? mergeForm(baseForm, state) : baseForm), [state]),
    validators: { onSubmit: SignInWithPasswordFormSchema },
  })

  return (
    <form
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.AppForm>
        <FieldGroup>
          <form.AppField name="email" validators={{ onBlur: EmailSchema }}>
            {(field) => (
              <field.Field>
                <field.Label>Email address</field.Label>
                <field.Input autoComplete="email" type="email" />

                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="password" validators={{ onBlur: PasswordSchema }}>
            {(field) => (
              <field.Field>
                <field.Label>Password</field.Label>
                <field.Input autoComplete="current-password" type="password" />
                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>

          <form.ServerError />
          <form.Submit className="w-full" loadingText="Signing in...">
            Sign in
          </form.Submit>
          <div className="flex w-full justify-center">
            <Button variant="link">
              <Link to="/forgot-password">Forgot password?</Link>
            </Button>
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  )
}
