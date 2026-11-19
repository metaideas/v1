import { createServerFn } from "@tanstack/react-start"
import { withLogger } from "#shared/server/middleware.ts"

export const publicFunction = createServerFn().middleware([withLogger])
