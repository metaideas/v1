import { createFileRoute, Link } from "@tanstack/react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@v1/ui/components/card"
import ResetPasswordForm from "#features/auth/components/reset-password-form.tsx"
import { ResetPasswordSearchSchema } from "#features/auth/schemas.ts"

function RouteComponent() {
  const { token } = Route.useSearch()

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-8">
      <Card className="w-full sm:mx-auto sm:max-w-[500px]">
        <CardHeader>
          <CardTitle className="text-center">Choose a new password</CardTitle>
          <CardDescription className="text-center">
            {token
              ? "Enter and confirm the new password for your account."
              : "This password reset link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="text-center text-sm">
              <Link className="font-medium underline underline-offset-4" to="/forgot-password">
                Request a new reset link
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute("/reset-password")({
  component: RouteComponent,
  validateSearch: ResetPasswordSearchSchema,
})
