import { auditRedactPreset, initLogger } from "evlog"

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
  env: { service: "app" },
  pretty: import.meta.env.DEV,
  redact: {
    ...auditRedactPreset,
    paths: [...(auditRedactPreset.paths ?? []), ...CREDENTIAL_PATHS],
  },
})

export { log } from "evlog"
