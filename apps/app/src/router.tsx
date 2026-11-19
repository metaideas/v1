import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query"
import SuperJSON from "superjson"
import { routeTree } from "#routeTree.gen.ts"
import ErrorFallback from "#shared/components/error.tsx"
import NotFound from "#shared/components/not-found.tsx"
import { log } from "#shared/logger.ts"
import { makeTRPCClient, type TRPC, TRPCProvider } from "#shared/trpc.tsx"

export type RouterContext = {
  queryClient: QueryClient
  log: typeof log
  trpc: TRPC
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: SuperJSON.serialize },
      hydrate: { deserializeData: SuperJSON.deserialize },
    },
  })
  const trpcClient = makeTRPCClient()
  const trpc = createTRPCOptionsProxy({ client: trpcClient, queryClient })

  const router = createRouter({
    Wrap: ({ children }) => (
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        {children}
      </TRPCProvider>
    ),
    context: {
      log,
      queryClient,
      trpc,
    } satisfies RouterContext,
    defaultErrorComponent: ErrorFallback,
    defaultNotFoundComponent: NotFound,
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true,
  })

  setupRouterSsrQueryIntegration({
    handleRedirects: true,
    queryClient,
    router,
    wrapQueryClient: true,
  })

  return router
}
