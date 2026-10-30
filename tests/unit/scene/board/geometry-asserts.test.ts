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

describe('expectNoCrossing — strict (réseaux de pistes)', () => {
  const strict = (polylines: Vec2[][], vias: { at: Vec2; net: string; crosses: string }[] = []) =>
    expectNoCrossing(polylines, (i) => `n${i}`, { strict: true, vias })

  it('rejette un T : l’extrémité de l’un posée sur l’autre', () => {
    expect(() => strict([line([0, 0], [2, 0]), line([1, 0], [1, 1])])).toThrow(/se touchent/)
  })

  it('rejette une superposition colinéaire et un contact par les extrémités', () => {
    expect(() => strict([line([0, 0], [2, 0]), line([1, 0], [3, 0])])).toThrow(/se touchent/)
    expect(() => strict([line([0, 0], [1, 1]), line([1, 1], [2, 0])])).toThrow(/se touchent/)
  })

  it('rejette un croisement hors pont, l’admet sur un pont déclaré entre ces deux réseaux', () => {
    const x = [line([0, 1], [2, 1]), line([1, 0], [1, 2])]
    expect(() => strict(x)).toThrow(/se croisent/)
    expect(() => strict(x, [{ at: [1, 1], net: 'n0', crosses: 'n9' }])).toThrow(/se croisent/)
    expect(() => strict(x, [{ at: [1.5, 1], net: 'n0', crosses: 'n1' }])).toThrow(/se croisent/)
    strict(x, [{ at: [1, 1], net: 'n1', crosses: 'n0' }])
  })

  it('ignore les paires d’un même réseau, et laisse passer des pistes disjointes', () => {
    expectNoCrossing([line([0, 0], [2, 0]), line([1, 0], [1, 1])], () => 'net', { strict: true })
    strict([line([0, 0], [2, 0]), line([0, 1], [2, 1])])
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
