import { AUTH_API_COOKIE_PREFIX, AUTH_APP_NAME } from "@v1/auth/constants"
import { createServerAuth } from "@v1/auth/server"
import { createDatabase } from "@v1/database/client"
import { createMailer } from "@v1/email/mailer"
import { selectTransport } from "@v1/email/transports"
import { createWorkflows } from "@v1/workflows/client"
import { createStorage } from "unstorage"
import redisDriver from "unstorage/drivers/redis"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"
import { allowedOrigins, baseUrl } from "#shared/utils.ts"

export const database = createDatabase({ logger: log, url: ENV.DATABASE_URL })

export const workflows = createWorkflows({ db: database, logger: log })

export const kv = createStorage({ driver: redisDriver({ url: ENV.REDIS_URL }) })

export const mailer = createMailer({
  from: ENV.EMAIL_FROM,
  logger: log,
  transport: selectTransport({ resendApiKey: ENV.RESEND_API_KEY, smtpUrl: ENV.SMTP_URL }),
})

export const auth = createServerAuth({
  basePath: "/auth",
  baseUrl,
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

export type Auth = typeof auth
export type Session = Auth["$Infer"]["Session"]
