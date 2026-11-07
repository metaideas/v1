import { defineApp } from "convex/server"
import { v } from "convex/values"
import betterAuth from "#functions/components/better-auth/convex.config.ts"

const app = defineApp({
  env: {
    AUTH_SECRET: v.string(),
    AUTH_TRUSTED_ORIGINS: v.string(),
  },
})

app.use(betterAuth)

export default app
