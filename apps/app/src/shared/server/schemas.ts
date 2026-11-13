import * as z from "@v1/utils/schema"

// A status of another type counts as absent, like a missing one.
const StatusCodeSchema = z.union([z.string(), z.number()]).nullish().catch(null)

const StatusFieldsSchema = z.object({ status: StatusCodeSchema, statusCode: StatusCodeSchema })

/**
 * The status fields of a thrown value and of its cause. A value without them, such as a thrown
 * string, parses to no fields.
 */
export const ThrownStatusSchema = StatusFieldsSchema.extend({
  cause: StatusFieldsSchema.nullish().catch(null),
}).catch({})
