import { useServerFn } from "@tanstack/react-start"
import { FieldGroup } from "@v1/ui/components/field"
import { useForm } from "@v1/ui/components/form"
import { toast } from "@v1/ui/components/toast"
import { forgotPassword } from "#features/auth/handlers.ts"
import { EmailSchema, ForgotPasswordFormSchema } from "#features/auth/schemas.ts"

export default function ForgotPasswordForm() {
  const requestPasswordReset = useServerFn(forgotPassword)
  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      await requestPasswordReset({
        data: { email: value.email },
      })

      toast.add({
        title: "Password reset link sent to your email",
        type: "success",
      })

      form.reset()
    },
    validators: {
      onSubmit: ForgotPasswordFormSchema,
    },
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
          <form.AppField name="email" validators={{ onBlur: EmailSchema }}>
            {(field) => (
              <field.Field>
                <field.Label>Email address</field.Label>
                <field.Input autoComplete="email" type="email" />

                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>

          <form.ServerError />
          <form.Submit className="w-full" loadingText="Sending reset link...">
            Send reset link
          </form.Submit>
        </FieldGroup>
      </form.AppForm>
    </form>
  )
}
