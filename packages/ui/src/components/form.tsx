import type React from "react"
import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { Alert, AlertDescription, AlertTitle } from "#components/alert.tsx"
import { Button } from "#components/button.tsx"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "#components/field.tsx"
import { Icon } from "#components/icon.tsx"
import { Input } from "#components/input.tsx"
import { Textarea } from "#components/textarea.tsx"

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()

function FieldInput(props: React.ComponentProps<typeof Input>) {
  const field = useFieldContext<string>()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Input
      {...props}
      aria-invalid={isInvalid}
      id={field.name}
      name={field.name}
      onBlur={field.handleBlur}
      onChange={(e) => {
        field.handleChange(e.target.value)
      }}
      value={field.state.value}
    />
  )
}

FieldInput.displayName = "FieldInput"

function FieldTextarea(props: React.ComponentProps<typeof Textarea>) {
  const field = useFieldContext<string>()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Textarea
      {...props}
      aria-invalid={isInvalid}
      id={field.name}
      name={field.name}
      onBlur={field.handleBlur}
      onChange={(e) => {
        field.handleChange(e.target.value)
      }}
      value={field.state.value}
    />
  )
}

FieldTextarea.displayName = "FieldTextarea"

function FormSubmit({
  loadingText = "Submitting...",
  children,
  ...props
}: React.ComponentProps<typeof Button> & { loadingText?: string }) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(formState) => [formState.canSubmit, formState.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button
          {...props}
          disabled={!canSubmit || isSubmitting}
          focusableWhenDisabled
          nativeButton
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Icon.Loader className="mr-2 h-4 w-4 animate-spin" />
              {loadingText}
            </>
          ) : (
            children
          )}
        </Button>
      )}
    </form.Subscribe>
  )
}

function FormServerError({
  title = "Error",
  ...props
}: React.ComponentProps<"div"> & { title?: string }) {
  const form = useFormContext()

  return (
    // oxlint-disable-next-line no-unsafe-return
    <form.Subscribe selector={(formState) => [formState.errorMap.onServer ?? []]}>
      {([error]) => {
        if (!error || typeof error !== "string") {
          return null
        }

        return (
          <Alert variant="destructive" {...props}>
            <Icon.AlertCircle className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )
      }}
    </form.Subscribe>
  )
}

FormServerError.displayName = "FormServerError"

export const { useAppForm: useForm, withForm } = createFormHook({
  fieldComponents: {
    Content: FieldContent,
    Description: FieldDescription,
    Error: FieldError,
    Field: (props: React.ComponentProps<typeof Field>) => {
      const field = useFieldContext()
      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

      return <Field {...props} data-invalid={isInvalid} />
    },
    Group: FieldGroup,
    Label: (props: React.ComponentProps<typeof FieldLabel>) => {
      const field = useFieldContext()

      return <FieldLabel {...props} htmlFor={field.name} />
    },
    Legend: FieldLegend,
    Separator: FieldSeparator,
    Set: FieldSet,
    Title: FieldTitle,

    Input: FieldInput,
    Textarea: FieldTextarea,
  },
  fieldContext,
  formComponents: {
    ServerError: FormServerError,
    Submit: FormSubmit,
  },
  formContext,
})
