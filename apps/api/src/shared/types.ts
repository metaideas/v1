import type { Database } from "@v1/database/client"
import type { Dispatcher } from "@v1/jobs/dispatcher"
import type { FileStorage } from "@v1/storage/server"
import type { DeepMerge } from "@v1/utils/type"
import type { EvlogVariables } from "evlog/hono"
import type { Storage } from "unstorage"
import type { Locale } from "#shared/internationalization/runtime.js"
import type { Auth, Session, workflows } from "#shared/services.ts"

export type AppContext = DeepMerge<
  EvlogVariables,
  {
    Variables: {
      auth: Auth
      db: Database
      dispatcher: Dispatcher
      kv: Storage
      language: Locale
      storage: FileStorage
      workflows: typeof workflows
    }
  }
>

export type AuthenticatedAppContext = DeepMerge<AppContext, { Variables: { session: Session } }>
