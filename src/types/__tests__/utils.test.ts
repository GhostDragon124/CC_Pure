import { describe, test } from 'bun:test'

import type { Permutations } from '../utils.js'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

type Assert<T extends true> = T

type ThreeValuePermutations =
  | ['alpha', 'beta', 'gamma']
  | ['alpha', 'gamma', 'beta']
  | ['beta', 'alpha', 'gamma']
  | ['beta', 'gamma', 'alpha']
  | ['gamma', 'alpha', 'beta']
  | ['gamma', 'beta', 'alpha']

type _PermutationsExpandUnionIntoTuplePermutations = Assert<
  Equal<Permutations<'alpha' | 'beta' | 'gamma'>, ThreeValuePermutations>
>

describe('Permutations', () => {
  test('is verified at compile time', () => {})
})
