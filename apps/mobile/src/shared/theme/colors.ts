/**
 * Uniwind reads a CSS variable as a string or a number. A color variable resolves to a string.
 */
export function isColor(value: string | number | undefined): value is string {
  return typeof value === "string"
}
