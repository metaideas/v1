import { AUTH_APP_NAME } from "@v1/auth/constants"
import { createServerAuth } from "@v1/auth/server"
import { tanstackStartCookies } from "@v1/auth/start"
import { createDatabase } from "@v1/database/server"
import { createMailer } from "@v1/email/mailer"
import { createTransport } from "@v1/email/transports"
import { useNitroHooks as getNitroHooks } from "nitro/app"
import { ENV } from "#shared/env.generated.ts"
import { log } from "#shared/logger.ts"

const database = createDatabase({ logger: log, url: ENV.DATABASE_URL })

const mailer = createMailer({
  from: ENV.EMAIL_FROM,
  logger: log,
  transport: createTransport({ resendApiKey: ENV.RESEND_API_KEY, smtpUrl: ENV.SMTP_URL }),
})

const auth = createServerAuth({
  basePath: "/api/auth",
  baseUrl: ENV.PUBLIC_BASE_URL,
  database,
  logger: log,
  plugins: [tanstackStartCookies()],
  secret: ENV.AUTH_SECRET,
  // The mailer logs a failed send. The reset response stays the same either way, so it does not
  // reveal whether the email went out.
  sendPasswordReset: ({ email, url }) =>
    mailer.send("password-reset", { appName: AUTH_APP_NAME, resetUrl: url }, { to: [email] }),
  socialProviders: {
    github: { clientId: ENV.GITHUB_CLIENT_ID, clientSecret: ENV.GITHUB_CLIENT_SECRET },
    google: { clientId: ENV.GOOGLE_CLIENT_ID, clientSecret: ENV.GOOGLE_CLIENT_SECRET },
  },
  trustedOrigins: ENV.AUTH_TRUSTED_ORIGINS,
})

export const services = { auth, database, mailer }

/**
 * Closes every service that holds a connection.
 */
async function close() {
  await database.close()
}

// Nitro runs its `close` hooks once the server stops taking requests, such as on SIGTERM. The hook
// is registered here because Nitro builds plugins apart from the server functions, so a plugin that
// imported this module would close a second copy of the services. `useNitroHooks` is a getter, not a
// React hook, so it takes a name that React's hook rules don't claim.
getNitroHooks().hook("close", close)
