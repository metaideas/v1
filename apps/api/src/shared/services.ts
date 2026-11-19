import { buildLimiter } from "@sanely/ratelimit"
import { redisStore } from "@sanely/ratelimit/stores/redis"
import { AUTH_API_COOKIE_PREFIX, AUTH_APP_NAME } from "@v1/auth/constants"
import { createAccessTokenPlugin, createServerAuth } from "@v1/auth/server"
import { createDatabase } from "@v1/database/server"
import { createMailer } from "@v1/email/mailer"
import { createTransport } from "@v1/email/transports"
import { createDispatcher } from "@v1/jobs/dispatcher"
import { createRealtime } from "@v1/realtime/server"
import { createUploadStorage, createS3Adapter } from "@v1/storage/server"
import { createWorkflows } from "@v1/workflows/server"
import { createClient } from "redis"
import { createStorage } from "unstorage"
import redisDriver from "unstorage/drivers/redis"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { deleteUpload, upsertUpload } from "#shared/uploads.ts"
import { allowedOrigins } from "#shared/utils.ts"

const database = createDatabase({ logger: log, url: ENV.DATABASE_URL })

const kv = createStorage({ driver: redisDriver({ url: ENV.REDIS_URL }) })

// Without the offline queue, a rate limit check fails at once while Redis is down. Queued checks
// would replay on reconnect and spend the new window after their requests already failed.
const redis = createClient({ disableOfflineQueue: true, url: ENV.REDIS_URL })
redis.on("error", (error) => {
  log.error({ error, message: "Redis connection error", scope: "api" })
})
// The client reconnects on its own, so connecting rejects only once it stops reconnecting.
redis.connect().catch((error: unknown) => {
  log.error({ error, message: "Redis connection closed", scope: "api" })
})

// Rate limits count in Redis, so every API instance shares them.
const limiter = buildLimiter({ prefix: "ratelimit", store: redisStore(redis) })

const dispatcher = createDispatcher({ logger: log, url: ENV.JOBS_REDIS_URL })

const realtime = createRealtime({ logger: log, url: ENV.REALTIME_REDIS_URL })

const mailer = createMailer({
  from: ENV.EMAIL_FROM,
  logger: log,
  transport: createTransport({ resendApiKey: ENV.RESEND_API_KEY, smtpUrl: ENV.SMTP_URL }),
})

const auth = createServerAuth({
  basePath: "/auth",
  baseUrl: ENV.BASE_URL,
  cookieDomain: ENV.AUTH_COOKIE_DOMAIN,
  cookiePrefix: AUTH_API_COOKIE_PREFIX,
  database,
  logger: log,
  plugins: [createAccessTokenPlugin()],
  secret: ENV.AUTH_SECRET,
  // The mailer logs a failed send. The reset response stays the same either way, so it does not
  // reveal whether the email went out.
  sendPasswordReset: ({ email, url }) =>
    mailer.send("password-reset", { appName: AUTH_APP_NAME, resetUrl: url }, { to: [email] }),
  socialProviders: {
    github: { clientId: ENV.GITHUB_CLIENT_ID, clientSecret: ENV.GITHUB_CLIENT_SECRET },
    google: { clientId: ENV.GOOGLE_CLIENT_ID, clientSecret: ENV.GOOGLE_CLIENT_SECRET },
  },
  trustedOrigins: allowedOrigins,
})

const storage = createUploadStorage({
  adapter: createS3Adapter({
    accessKeyId: ENV.S3_ACCESS_KEY_ID,
    bucket: ENV.S3_BUCKET,
    endpoint: ENV.S3_ENDPOINT,
    region: ENV.S3_REGION,
    secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
  }),
  logger: log,
  onUploadDeleted: deleteUpload,
  onUploadStored: upsertUpload,
})

const workflows = createWorkflows({
  baseUrl: ENV.INNGEST_BASE_URL,
  eventKey: ENV.INNGEST_EVENT_KEY,
  id: "api",
  isDev: ENV.INNGEST_DEV,
  logger: log,
  signingKey: ENV.INNGEST_SIGNING_KEY,
  signingKeyFallback: ENV.INNGEST_SIGNING_KEY_FALLBACK,
})

export const services = {
  auth,
  database,
  dispatcher,
  kv,
  limiter,
  mailer,
  realtime,
  storage,
  workflows,
}

export type Services = typeof services

export type Session = Services["auth"]["$Infer"]["Session"]

/**
 * Closes every service that holds a connection. Call it after the server stops taking requests.
 */
export async function close() {
  // A reconnecting Redis client may never answer the commands that `close()` waits for, so it is
  // destroyed instead. A client that is not open throws on both.
  if (redis.isOpen && !redis.isReady) redis.destroy()
  await Promise.all([
    dispatcher.close(),
    kv.dispose(),
    realtime.close(),
    redis.isReady && redis.close(),
    database.close(),
  ])
}
