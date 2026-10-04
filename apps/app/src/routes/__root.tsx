import type { ReactNode } from "react"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import globals from "@v1/ui/globals.css?url"
import type { RouterContext } from "#router.tsx"
import ThemeScript from "#features/theme/components/theme-script.tsx"
import { getTheme, setTheme } from "#features/theme/handlers.ts"
import Providers from "#shared/components/providers.tsx"
import { baseLocale } from "#shared/internationalization/runtime.js"

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { theme } = Route.useLoaderData()

  return (
    <html className={theme} lang={baseLocale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}

        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  const { theme } = Route.useLoaderData()

  return (
    <RootDocument>
      <ThemeScript />
      <Providers setTheme={(value) => void setTheme({ data: value })} theme={theme}>
        <Outlet />
      </Providers>

      {import.meta.env.DEV ? (
        <TanStackDevtools
          config={{ position: "bottom-left" }}
          plugins={[
            { name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
            { name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
            {
              name: "TanStack Form",
              render: <FormDevtoolsPanel />,
            },
          ]}
        />
      ) : null}
    </RootDocument>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async () => ({
    theme: await getTheme(),
  }),

  component: RootComponent,
  head: () => ({
    links: [{ href: globals, rel: "stylesheet" }],
    meta: [
      { charSet: "utf8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "v1" },
    ],
  }),
})
