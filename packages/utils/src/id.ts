import { customAlphabet } from "nanoid"

const NO_LOOKALIKE_ALPHABET = "346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz"

const nanoid = customAlphabet(NO_LOOKALIKE_ALPHABET)

export function createIdGenerator({ prefix, size }: { prefix: string; size: number }) {
  return () => `${prefix}_${nanoid(size)}`
}
