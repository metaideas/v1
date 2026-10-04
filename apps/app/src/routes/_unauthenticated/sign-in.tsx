import { createFileRoute, Link } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@v1/ui/components/card"
import { Separator } from "@v1/ui/components/separator"
import SignInWithPasswordForm from "#features/auth/components/sign-in-with-password-form.tsx"
import SignInWithSocialButton from "#features/auth/components/sign-in-with-social-button.tsx"
import { signInWithPasswordForm } from "#features/auth/handlers.ts"
import { withFormCsrf } from "#shared/server/csrf.ts"

function RouteComponent() {
  const formState = Route.useLoaderData()

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-8">
      <Card className="w-full sm:mx-auto sm:max-w-[500px]">
        <CardHeader>
          <CardTitle className="text-center">Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <SignInWithPasswordForm state={formState} />

          <div className="relative my-6">
            <div aria-hidden="true" className="absolute inset-0 flex items-center">
              <Separator />
            </div>

            <div className="relative flex justify-center text-sm leading-6 font-medium">
              <span className="bg-background px-6 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <SignInWithSocialButton className="w-full min-w-[180px] sm:flex-1" provider="google" />
            <SignInWithSocialButton className="w-full min-w-[180px] sm:flex-1" provider="github" />
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              className="font-medium text-primary underline-offset-4 hover:text-primary/80 hover:underline"
              to="/sign-up"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// oxlint-disable-next-line sort-keys -- TanStack infers the loader's `serverContext` type from `server`, so `server` must come first.
export const Route = createFileRoute("/_unauthenticated/sign-in")({
  component: RouteComponent,
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        // Native form submissions without JavaScript. A rejected submission renders this page
        // again with its errors.
        POST: {
          handler: async ({ next, request }) => {
            const result = await signInWithPasswordForm(request)

            if ("response" in result) {
              return result.response
            }

            return next({ context: { signInFormState: result.formState } })
          },
          middleware: [withFormCsrf],
        },
      }),
  },
  loader: ({ serverContext }) => serverContext?.signInFormState ?? null,
})
