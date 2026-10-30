import { describe, expect, it } from 'vitest'
import { BOARD_MARGIN, boardBounds, timelineOriginZ } from '@/scene/state/board/bounds'
import type { Rect } from '@/scene/state/board/rect'
import type { Zone } from '@/scene/state/board/zones'

const rect = (minX: number, minZ: number, maxX: number, maxZ: number): Rect => ({
  minX,
  minZ,
  maxX,
  maxZ,
})
const zoneAt = (bounds: Rect): Zone => ({
  family: 'language',
  tone: 'cyan',
  bounds,
  chips: [],
  exit: [0, 0],
  labelAnchor: [0, 0],
})

describe('timelineOriginZ', () => {
  it('deux unités devant le plus avancé du quartier et des zones', () => {
    expect(timelineOriginZ(rect(-2, -2, 2, 2), [])).toBe(4)
    expect(timelineOriginZ(rect(-2, -2, 2, 2), [zoneAt(rect(3, -1, 5, 3.5))])).toBe(5.5)
    expect(timelineOriginZ(rect(-2, -2, 2, 2), [zoneAt(rect(3, -6, 5, -3))])).toBe(4)
  })
})

describe('boardBounds', () => {
  it('l’union des rectangles, élargie de BOARD_MARGIN', () => {
    expect(BOARD_MARGIN).toBe(1.5)
    expect(boardBounds([rect(-1, -2, 1, 0), rect(0, 0, 3, 4)])).toEqual(
      rect(-1 - BOARD_MARGIN, -2 - BOARD_MARGIN, 3 + BOARD_MARGIN, 4 + BOARD_MARGIN),
    )
  })

  it('liste vide : un carré de côté 4 centré sur l’origine', () => {
    expect(boardBounds([])).toEqual(rect(-2, -2, 2, 2))
  })
})
