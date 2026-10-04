import { auditRedactPreset, log as evlog, initLogger } from "evlog"
import { serializeError } from "serialize-error"
import { isDevelopment } from "std-env"

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
  env: { service: "api" },
  minLevel: isDevelopment ? "debug" : "info",
  redact: {
    ...auditRedactPreset,
    paths: [...(auditRedactPreset.paths ?? []), ...CREDENTIAL_PATHS],
  },
})

type LogEvent = Record<string, unknown>

// evlog clones an event before it writes it, and the clone turns an `Error` anywhere in the event
// into `{}`. Converting errors to plain objects first keeps their name, message, stack, and cause.
export const log = {
  debug: (event: LogEvent) => {
    evlog.debug(serializeError(event))
  },
  error: (event: LogEvent) => {
    evlog.error(serializeError(event))
  },
  info: (event: LogEvent) => {
    evlog.info(serializeError(event))
  },
  warn: (event: LogEvent) => {
    evlog.warn(serializeError(event))
  },
}
