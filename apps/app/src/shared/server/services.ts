import { AUTH_APP_NAME } from "@v1/auth/constants"
import { createServerAuth } from "@v1/auth/server"
import { tanstackStartCookies } from "@v1/auth/start"
import { createDatabase } from "@v1/database/client"
import { createMailer } from "@v1/email/mailer"
import { selectTransport } from "@v1/email/transports"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"

export const database = createDatabase({ logger: log, url: ENV.DATABASE_URL })

export const mailer = createMailer({
  from: ENV.EMAIL_FROM,
  logger: log,
  transport: selectTransport({ resendApiKey: ENV.RESEND_API_KEY, smtpUrl: ENV.SMTP_URL }),
})

export const auth = createServerAuth({
  basePath: "/api/auth",
  baseUrl: ENV.PUBLIC_BASE_URL,
  database,
  logger: log,
  plugins: [tanstackStartCookies()],
  secret: ENV.AUTH_SECRET,
  // The mailer logs a failed send. The reset response stays the same either way, so it does not
  // reveal whether the email went out.
  sendPasswordReset: async ({ email, url }) => {
    await mailer.send("password-reset", { appName: AUTH_APP_NAME, resetUrl: url }, { to: [email] })
  },
  socialProviders: {
    github: { clientId: ENV.GITHUB_CLIENT_ID, clientSecret: ENV.GITHUB_CLIENT_SECRET },
    google: { clientId: ENV.GOOGLE_CLIENT_ID, clientSecret: ENV.GOOGLE_CLIENT_SECRET },
  },
  trustedOrigins: ENV.AUTH_TRUSTED_ORIGINS,
})
