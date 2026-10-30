import { describe, expect, it } from 'vitest'

import type { Vec2 } from '@/scene/state/board/rect'
import { expectNoCrossing, expectOctilinear } from './geometry-asserts'

const line = (...p: Vec2[]): Vec2[] => p

describe('expectNoCrossing', () => {
  it('détecte un X', () => {
    expect(() => expectNoCrossing([line([0, 0], [2, 2]), line([0, 2], [2, 0])])).toThrow(
      /se croisent/,
    )
  })

  it('ne compte pas une extrémité qui touche, ni une superposition colinéaire', () => {
    expectNoCrossing([line([0, 0], [2, 0]), line([1, 0], [2, 1])])
    expectNoCrossing([line([0, 0], [2, 0]), line([1, 0], [3, 0])])
    expectNoCrossing([line([0, 0], [1, 1]), line([1, 1], [2, 0])])
  })

  it('exclut les paires d’un même groupe', () => {
    const x = [line([0, 0], [2, 2]), line([0, 2], [2, 0])]
    expectNoCrossing(x, () => 'net')
    expect(() => expectNoCrossing(x, (i) => i)).toThrow()
  })
})

describe('expectOctilinear', () => {
  it('refuse une pente quelconque et un segment nul', () => {
    expect(() =>
      expectOctilinear([
        [0, 0],
        [2, 1],
      ]),
    ).toThrow()
    expect(() =>
      expectOctilinear([
        [0, 0],
        [0, 0],
      ]),
    ).toThrow()
    expectOctilinear([
      [0, 0],
      [1, 1],
      [1, 3],
    ])
  })
})
