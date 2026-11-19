import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query"
import type { TRPCRouter } from "api/client"
import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client"
import { createTRPCContext } from "@trpc/tanstack-react-query"
import superjson from "superjson"
import { ENV } from "#shared/env.generated.ts"
import { buildApiUrl } from "#shared/utils.ts"

export type TRPC = TRPCOptionsProxy<TRPCRouter>

export const { useTRPC, useTRPCClient, TRPCProvider } = createTRPCContext<TRPCRouter>()

export const makeTRPCClient = createIsomorphicFn()
  .server(() =>
    createTRPCClient<TRPCRouter>({
      links: [
        httpBatchStreamLink({
          headers: () => {
            const headers = getRequestHeaders()
            return {
              authorization: headers.get("authorization") ?? undefined,
              cookie: headers.get("cookie") ?? undefined,
            }
          },
          transformer: superjson,
          url: new URL("/trpc", ENV.API_URL).href,
        }),
      ],
    })
  )
  .client(() =>
    createTRPCClient<TRPCRouter>({
      links: [httpBatchStreamLink({ transformer: superjson, url: buildApiUrl("/trpc") })],
    })
  )
