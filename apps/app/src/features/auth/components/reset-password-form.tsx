import { useNavigate } from "@tanstack/react-router"
import { FieldGroup } from "@v1/ui/components/field"
import { useForm } from "@v1/ui/components/form"
import { toast } from "@v1/ui/components/toast"
import { PasswordSchema, ResetPasswordFormSchema } from "#features/auth/schemas.ts"
import { authClient } from "#shared/auth.ts"

export default function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: { confirmPassword: "", password: "" },
    onSubmit: async ({ value }) => {
      await authClient.resetPassword(
        {
          newPassword: value.password,
          token,
        },
        {
          onError: ({ error }) => {
            toast.add({ title: error.message, type: "error" })
          },
          onSuccess: () => {
            toast.add({ title: "Your password has been reset", type: "success" })
            void navigate({ to: "/sign-in" })
          },
        }
      )
    },
    validators: { onSubmit: ResetPasswordFormSchema },
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.AppForm>
        <FieldGroup>
          <form.AppField name="password" validators={{ onBlur: PasswordSchema }}>
            {(field) => (
              <field.Field>
                <field.Label>New password</field.Label>
                <field.Input autoComplete="new-password" type="password" />
                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="confirmPassword" validators={{ onBlur: PasswordSchema }}>
            {(field) => (
              <field.Field>
                <field.Label>Confirm new password</field.Label>
                <field.Input autoComplete="new-password" type="password" />
                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.ServerError />
          <form.Submit className="w-full" loadingText="Resetting password...">
            Reset password
          </form.Submit>
        </FieldGroup>
      </form.AppForm>
    </form>
  )
}
