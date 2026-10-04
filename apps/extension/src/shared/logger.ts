import { serializeErrors } from "@v1/utils/error"
import { auditRedactPreset, log as evlog, initLogger } from "evlog"

// The preset masks exact field names such as `secret` and `apiKey`. A bare word also masks the
// whole field name in any casing, such as `passPhrase`. The globs mask credentials inside longer
// names, such as `clientSecret`, `AUTH_SECRET`, and `api_key`, in each casing, because evlog's globs
// are case-sensitive.
const CREDENTIAL_WORDS = [
  "secret",
  "token",
  "password",
  "passphrase",
  "passcode",
  "apikey",
  "apiKey",
  "api_key",
  "api-key",
] as const
const CREDENTIAL_PATHS = [
  ...new Set(
    CREDENTIAL_WORDS.flatMap((word) => [
      word,
      `*${word}*`,
      `*${word.charAt(0).toUpperCase()}${word.slice(1)}*`,
      `*${word.toUpperCase()}*`,
    ])
  ),
]

initLogger({
  env: { service: "extension" },
  pretty: import.meta.env.DEV,
  redact: {
    ...auditRedactPreset,
    paths: [...(auditRedactPreset.paths ?? []), ...CREDENTIAL_PATHS],
  },
})

type LogEvent = Record<string, unknown>

// evlog writes an `Error` inside an event as `{}`.
export const log = {
  debug: (event: LogEvent) => {
    evlog.debug(serializeErrors(event))
  },
  error: (event: LogEvent) => {
    evlog.error(serializeErrors(event))
  },
  info: (event: LogEvent) => {
    evlog.info(serializeErrors(event))
  },
  warn: (event: LogEvent) => {
    evlog.warn(serializeErrors(event))
  },
}
