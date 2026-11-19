import { createServerFn } from "@tanstack/react-start"
import { withServices, withLogger } from "#shared/server/middleware.ts"

export const publicFunction = createServerFn().middleware([withLogger, withServices])
