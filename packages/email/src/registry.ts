import type { ComponentProps, ReactElement } from "react"
import { createElement } from "react"
import PasswordReset from "#templates/password-reset.tsx"

type TemplatePropsMap = {
  "password-reset": ComponentProps<typeof PasswordReset>
}

export type TemplateName = keyof TemplatePropsMap

export type TemplateProps<Name extends TemplateName> = TemplatePropsMap[Name]

type Templates = {
  [Name in TemplateName]: (props: TemplateProps<Name>) => { element: ReactElement; subject: string }
}

/**
 * Every email the mailer can send. Each template owns its subject, so callers pass only the name,
 * the props, and the recipients.
 */
export const templates: Templates = {
  "password-reset": (props) => ({
    element: createElement(PasswordReset, props),
    subject: `Reset your ${props.appName} password`,
  }),
}
