import type { DeepMerge } from "@v1/utils/type"
import type { EvlogVariables } from "evlog/hono"
import type { Locale } from "#shared/internationalization/runtime.js"
import type { Services, Session } from "#shared/services.ts"

export type AppContext = DeepMerge<
  EvlogVariables,
  {
    Variables: {
      language: Locale
      services: Services
    }
  }
>

export type AuthenticatedAppContext = DeepMerge<AppContext, { Variables: { session: Session } }>

export type AccessTokenAppContext = DeepMerge<AppContext, { Variables: { userId: string } }>
