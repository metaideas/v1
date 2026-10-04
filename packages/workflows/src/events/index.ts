import { demo } from "#events/demo.ts"

/**
 * Every event, one file per domain. An event's path here matches its name, so
 * `events.demo.welcome.requested` is `demo/welcome.requested`.
 */
export const events = { demo }
