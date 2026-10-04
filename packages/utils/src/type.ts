type StringToArray<
  S extends string,
  Acc extends string[] = [],
> = S extends `${infer Char}${infer Rest}` ? StringToArray<Rest, [...Acc, Char]> : Acc

/**
 * Checks if A <= B using tuple length comparison.
 */
type LessThanOrEqual<
  A extends number,
  B extends number,
  CounterA extends readonly unknown[] = [],
  CounterB extends readonly unknown[] = [],
> = CounterA["length"] extends A
  ? CounterB["length"] extends B
    ? true // A === B
    : CounterB extends readonly [...CounterA, ...infer Rest]
      ? Rest["length"] extends 0
        ? true // A === B
        : true // A < B (there are remaining items in CounterB)
      : false // A > B
  : CounterB["length"] extends B
    ? false // A > B (CounterA still growing but CounterB reached B)
    : LessThanOrEqual<A, B, readonly [...CounterA, unknown], readonly [...CounterB, unknown]>

/**
 * Merges two types, deeply merging objects.
 */
export type DeepMerge<T, U> = Omit<T, keyof U> & {
  [K in keyof U]: K extends keyof T
    ? T[K] extends object
      ? U[K] extends object
        ? DeepMerge<T[K], U[K]>
        : U[K]
      : U[K]
    : U[K]
}

/**
 * Makes a type more readable in IDE tooltips by expanding intersections and removing unnecessary
 * type information.
 */
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

/**
 * A type that validates if a string has the length specified by a number. If valid, it resolves to
 * the string. If invalid, it resolves to an error message string, causing a type error on
 * assignment.
 */
export type ConstrainedString<
  ActualString extends string,
  MaxLengthSpec extends number,
  _MaxNumericLength extends number = MaxLengthSpec extends number
    ? MaxLengthSpec
    : MaxLengthSpec extends string
      ? MaxLengthSpec
      : never, // Invalid MaxLengthSpec format
  _ActualCharsTuple extends string[] = StringToArray<ActualString>,
  _ActualNumericLength extends number = _ActualCharsTuple["length"],
  _IsLengthValid extends boolean = _ActualNumericLength extends number
    ? _MaxNumericLength extends number
      ? LessThanOrEqual<_ActualNumericLength, _MaxNumericLength>
      : false
    : false,
> = _MaxNumericLength extends never
  ? `Error: Invalid length specification "${MaxLengthSpec}". Must be a number or a string representation of a number.`
  : _IsLengthValid extends true
    ? ActualString // Validation passed: the type is the string literal itself
    : `Error: String "${ActualString}" (length: ${_ActualNumericLength}) exceeds maximum length of ${_MaxNumericLength} characters.`
