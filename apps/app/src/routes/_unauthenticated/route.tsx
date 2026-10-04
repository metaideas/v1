import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { AUTHENTICATED_PATHNAME } from "#features/auth/constants.ts"
import { validateSession } from "#features/auth/handlers.ts"

function LayoutComponent() {
  return <Outlet />
}

export const Route = createFileRoute("/_unauthenticated")({
  beforeLoad: async () => {
    const session = await validateSession()

    if (session) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects use thrown control-flow objects.
      throw redirect({ to: AUTHENTICATED_PATHNAME })
    }

    return { session }
  },
  component: LayoutComponent,
})
