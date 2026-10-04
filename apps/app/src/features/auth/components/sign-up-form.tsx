import { useNavigate } from "@tanstack/react-router"
import { FieldGroup } from "@v1/ui/components/field"
import { useForm } from "@v1/ui/components/form"
import * as z from "@v1/utils/schema/mini"
import { AUTHENTICATED_PATHNAME } from "#features/auth/constants.ts"
import { checkEmailAvailability } from "#features/auth/handlers.ts"
import {
  EmailSchema,
  NameSchema,
  PasswordSchema,
  SignUpFormSchema,
} from "#features/auth/schemas.ts"
import { signUp } from "#shared/auth.ts"

export default function SignUpForm() {
  const navigate = useNavigate()
  const form = useForm({
    defaultValues: { confirmPassword: "", email: "", name: "", password: "" },
    onSubmit: async ({ value }) => {
      await signUp.email(value, {
        onSuccess: () => {
          void navigate({ to: AUTHENTICATED_PATHNAME })
        },
      })
    },
    validators: {
      onSubmit: SignUpFormSchema,
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
          <form.AppField name="name" validators={{ onBlur: NameSchema }}>
            {(field) => (
              <field.Field>
                <field.Label>Name</field.Label>

                <field.Input autoComplete="name" type="text" />

                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.AppField
            name="email"
            validators={{
              onBlur: EmailSchema,
              onBlurAsync: async ({ value }) => {
                const { isAvailable } = await checkEmailAvailability({
                  data: {
                    email: value,
                  },
                })

                if (isAvailable) {
                  return
                }

                return { message: "Email is already in use" }
              },
            }}
          >
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
                <field.Input autoComplete="new-password" type="password" />
                <field.Description>At least 8 characters</field.Description>

                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.AppField
            name="confirmPassword"
            validators={{
              onBlur: PasswordSchema.check(
                z.refine((value) => value === form.getFieldValue("password"), {
                  error: "Passwords don't match",
                })
              ),
              onBlurListenTo: ["password"],
              onChangeListenTo: ["password"],
            }}
          >
            {(field) => (
              <field.Field>
                <field.Label>Confirm Password</field.Label>

                <field.Input autoComplete="new-password" type="password" />

                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.ServerError />
          <form.Submit className="w-full" loadingText="Signing up...">
            Sign up
          </form.Submit>
        </FieldGroup>
      </form.AppForm>
    </form>
  )
}
