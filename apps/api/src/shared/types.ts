import type { Database } from "@v1/database/client"
import type { Dispatcher } from "@v1/jobs/dispatcher"
import type { DeepMerge } from "@v1/utils/type"
import type { EvlogVariables } from "evlog/hono"
import type { Files } from "files-sdk"
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
      files: Files
      kv: Storage
      language: Locale
      workflows: typeof workflows
    }
  }
>

export type AuthenticatedAppContext = DeepMerge<AppContext, { Variables: { session: Session } }>
