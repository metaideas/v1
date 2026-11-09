import { describe, expect, expectTypeOf, test } from "bun:test"
import { admin } from "better-auth/plugins"
import { drizzle } from "drizzle-orm/postgres-js"
import { createServerAuth } from "#server.ts"

const options = {
  basePath: "/auth",
  baseUrl: "http://localhost:3000",
  database: drizzle.mock(),
  secret: "test-secret-that-is-at-least-32-characters",
  trustedOrigins: [],
}

describe("createServerAuth", () => {
  test("keeps the endpoints and session fields of the plugins it receives", () => {
    const auth = createServerAuth({ ...options, plugins: [admin()] })

    expect(auth.api.createUser).toBeFunction()
    expectTypeOf<typeof auth.$Infer.Session.user>().toHaveProperty("role")
    expectTypeOf<typeof auth.$Infer.Session.session>().toHaveProperty("impersonatedBy")
  })
})
