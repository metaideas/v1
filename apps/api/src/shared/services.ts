import { AUTH_API_COOKIE_PREFIX, AUTH_APP_NAME } from "@v1/auth/constants"
import { createServerAuth } from "@v1/auth/server"
import { createDatabase } from "@v1/database/client"
import { createMailer } from "@v1/email/mailer"
import { selectTransport } from "@v1/email/transports"
import { createDispatcher } from "@v1/jobs/dispatcher"
import { Workflows } from "@v1/workflows/client"
import { createFiles } from "files-sdk"
import { bunS3 } from "files-sdk/bun-s3"
import { contentType } from "files-sdk/content-type"
import { signedUrlPolicy } from "files-sdk/signed-url-policy"
import { validation } from "files-sdk/validation"
import { createStorage } from "unstorage"
import redisDriver from "unstorage/drivers/redis"
import { ENV } from "#shared/env.generated.ts"
import { FILES_MAX_UPLOAD_SIZE, FILES_MAX_URL_AGE, handleFileAction } from "#shared/files.ts"
import { log } from "#shared/logger.ts"
import { FileKeySchema } from "#shared/schemas.ts"
import { allowedOrigins } from "#shared/utils.ts"

export const database = createDatabase({ logger: log, url: ENV.DATABASE_URL })

export const kv = createStorage({ driver: redisDriver({ url: ENV.REDIS_URL }) })

export const dispatcher = createDispatcher({ logger: log, url: ENV.JOBS_REDIS_URL })

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
  plugins: [],
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

export const files = createFiles({
  adapter: bunS3({
    accessKeyId: ENV.S3_ACCESS_KEY_ID,
    bucket: ENV.S3_BUCKET,
    endpoint: ENV.S3_ENDPOINT,
    region: ENV.S3_REGION,
    secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
    virtualHostedStyle: !ENV.S3_ENDPOINT,
  }),
  hooks: { onAction: handleFileAction },
  plugins: [
    signedUrlPolicy({
      maxExpiresIn: FILES_MAX_URL_AGE,
      maxUploadSize: FILES_MAX_UPLOAD_SIZE,
    }),
    validation({
      allowedTypes: ["image/*", "application/pdf"],
      key: (key) => FileKeySchema.safeParse(key).success,
      maxSize: FILES_MAX_UPLOAD_SIZE,
      minSize: 1,
    }),
    contentType({ onMismatch: "reject" }),
  ],
})

export const workflows = new Workflows({
  logger: log,
  poolSize: 5,
  queues: { default: { concurrency: 10 } },
  url: ENV.DATABASE_URL,
})

export type Auth = typeof auth
export type Session = Auth["$Infer"]["Session"]
