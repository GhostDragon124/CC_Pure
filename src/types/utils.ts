// Utility types shared across the codebase.

/**
 * Recursively marks all properties as readonly (deeply immutable).
 */
export type DeepImmutable<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
    : T

/**
 * Generates every ordered tuple permutation of a union type.
 */
export type Permutations<T, U = T> = [T] extends [never]
  ? []
  : T extends U
    ? [T, ...Permutations<Exclude<U, T>>]
    : never
