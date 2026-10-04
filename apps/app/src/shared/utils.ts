import { hasWindow } from "@v1/utils/env"
import { createUrlBuilder } from "@v1/utils/url"
import { ENV } from "#shared/env.generated.ts"

function getProtocol(url: string) {
  return new URL(url).protocol === "http:" ? "http" : "https"
}

const baseUrl = hasWindow ? globalThis.location.origin : ENV.PUBLIC_BASE_URL

export const buildUrl = createUrlBuilder(baseUrl, getProtocol(baseUrl))

const apiUrl = ENV.PUBLIC_API_URL ?? `${baseUrl}/api`
export const buildApiUrl = createUrlBuilder(apiUrl, getProtocol(apiUrl))
