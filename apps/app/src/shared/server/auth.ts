import { createServerOnlyFn } from "@tanstack/react-start"
import { createAuthClient } from "@v1/auth/client"
import { ENV } from "#shared/env.generated.ts"

export const createServerAuthClient = createServerOnlyFn(() =>
  createAuthClient(new URL("/auth", ENV.API_URL).href)
)
