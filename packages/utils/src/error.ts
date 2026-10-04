function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function serializeValue(value: unknown, ancestors: WeakSet<object>): unknown {
  if (typeof value !== "object" || value === null) {
    return value
  }

  if (ancestors.has(value)) {
    return "[Circular]"
  }

  if (!(value instanceof Error) && !Array.isArray(value) && !isPlainObject(value)) {
    return value
  }

  ancestors.add(value)
  const entries = Object.entries(value).map(([key, item]) => [key, serializeValue(item, ancestors)])
  let serialized: unknown = Object.fromEntries(entries)

  if (Array.isArray(value)) {
    serialized = entries.map(([, item]) => item)
  } else if (value instanceof Error) {
    serialized = {
      message: value.message,
      name: value.name,
      ...Object.fromEntries(entries),
      ...(value.cause === undefined ? {} : { cause: serializeValue(value.cause, ancestors) }),
      stack: value.stack,
    }
  }

  ancestors.delete(value)
  return serialized
}

/**
 * Replaces each `Error` in a record, at any depth, with a plain object that keeps its name,
 * message, stack, cause, and own properties such as `code`. `JSON.stringify` and `structuredClone`
 * drop those fields from an `Error`.
 */
export function serializeErrors(record: Record<string, unknown>) {
  const ancestors = new WeakSet<object>([record])

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, serializeValue(value, ancestors)])
  )
}
