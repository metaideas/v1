import type { Database } from "@v1/database/server"
import type { Dispatcher } from "@v1/jobs/dispatcher"
import type { Realtime } from "@v1/realtime/server"
import type { UploadStorage } from "@v1/storage/server"
import type { DeepMerge } from "@v1/utils/type"
import type { Workflows } from "@v1/workflows/server"
import type { EvlogVariables } from "evlog/hono"
import type { Storage } from "unstorage"
import type { Locale } from "#shared/internationalization/runtime.js"
import type { Auth, Session } from "#shared/services.ts"

export type AppContext = DeepMerge<
  EvlogVariables,
  {
    Variables: {
      auth: Auth
      db: Database
      dispatcher: Dispatcher
      kv: Storage
      language: Locale
      realtime: Realtime
      storage: UploadStorage
      workflows: Workflows
    }
  }
>

export type AuthenticatedAppContext = DeepMerge<AppContext, { Variables: { session: Session } }>

export type AccessTokenAppContext = DeepMerge<AppContext, { Variables: { userId: string } }>
