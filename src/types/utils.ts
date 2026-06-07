// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Utility types shared across the codebase.
// DeepImmutable and Permutations are placeholder type-level utilities.
// When the upstream decompiled source is available, replace with the real
// generic type definitions.

/**
 * Recursively marks all properties as readonly (deeply immutable).
 * Current stub: identity passthrough — does not enforce immutability at type level.
 */
export type DeepImmutable<T> = T

/**
 * Generates all permutations of a union type as a tuple.
 * Current stub: simple array passthrough.
 */
export type Permutations<T> = T[]
