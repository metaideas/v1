import { buildLimiter } from "@sanely/ratelimit"
import { redisStore } from "@sanely/ratelimit/stores/redis"
import { AUTH_API_COOKIE_PREFIX, AUTH_APP_NAME } from "@v1/auth/constants"
import { createAccessTokenPlugin, createServerAuth } from "@v1/auth/server"
import { createDatabase } from "@v1/database/client"
import { createMailer } from "@v1/email/mailer"
import { selectTransport } from "@v1/email/transports"
import { createDispatcher } from "@v1/jobs/dispatcher"
import { createRealtime } from "@v1/realtime/server"
import { createUploadStorage, createS3Adapter } from "@v1/storage/server"
import { createWorkflows } from "@v1/workflows/client"
import { createClient } from "redis"
import { createStorage } from "unstorage"
import redisDriver from "unstorage/drivers/redis"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { deleteUpload, upsertUpload } from "#shared/uploads.ts"
import { allowedOrigins } from "#shared/utils.ts"

export const database = createDatabase({ logger: log, url: ENV.DATABASE_URL })

export const kv = createStorage({ driver: redisDriver({ url: ENV.REDIS_URL }) })

// Without the offline queue, a rate limit check fails at once while Redis is down. Queued checks
// would replay on reconnect and spend the new window after their requests already failed.
export const redis = createClient({ disableOfflineQueue: true, url: ENV.REDIS_URL })
redis.on("error", (error) => {
  log.error({ error, message: "Redis connection error", scope: "api" })
})
// The client reconnects on its own, so connecting rejects only once it stops reconnecting.
redis.connect().catch((error: unknown) => {
  log.error({ error, message: "Redis connection closed", scope: "api" })
})

// Rate limits count in Redis, so every API instance shares them.
export const limiter = buildLimiter({ prefix: "ratelimit", store: redisStore(redis) })

export const dispatcher = createDispatcher({ logger: log, url: ENV.JOBS_REDIS_URL })

export const realtime = createRealtime({ logger: log, url: ENV.REALTIME_REDIS_URL })

export const mailer = createMailer({
  from: ENV.EMAIL_FROM,
  logger: log,
  transport: selectTransport({ resendApiKey: ENV.RESEND_API_KEY, smtpUrl: ENV.SMTP_URL }),
})

export const auth = createServerAuth({
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

export const storage = createUploadStorage({
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

export const workflows = createWorkflows({
  baseUrl: ENV.INNGEST_BASE_URL,
  eventKey: ENV.INNGEST_EVENT_KEY,
  id: "api",
  isDev: ENV.INNGEST_DEV,
  logger: log,
  signingKey: ENV.INNGEST_SIGNING_KEY,
  signingKeyFallback: ENV.INNGEST_SIGNING_KEY_FALLBACK,
})

export type Auth = typeof auth
export type Session = Auth["$Infer"]["Session"]
