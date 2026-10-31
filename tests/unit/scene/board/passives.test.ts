import { describe, expect, it } from 'vitest'
import { RoutingGrid } from '@/scene/state/board/grid'
import { GRID } from '@/scene/state/plane'
import { BOARD_DENSITY } from '@/scene/state/layout'
import { scatterPassives } from '@/scene/state/board/passives'
import { rectsOverlap } from '@/scene/state/board/rect'
import { type Rect, rectOf, type Vec2 } from '@/scene/state/plane'

const board: Rect = { minX: -5, minZ: -5, maxX: 5, maxZ: 5 }
const SEED = 7
/** L'emplacement réservé à une étiquette, centré sur son ancre (épinglé ici, privé au module). */
const labelKeepOut = (anchor: Vec2): Rect => rectOf(anchor, 2, 0.6)

/** Les cellules couvertes par un petit composant (2×1, ou 1×2 si tourné). */
function cellsOf(grid: RoutingGrid, p: { center: readonly [number, number]; rotated: boolean }) {
  const w = p.rotated ? 1 : 2
  const h = p.rotated ? 2 : 1
  const [x, z] = p.center
  const out: (readonly [number, number])[] = []
  for (let i = 0; i < w; i++)
    for (let j = 0; j < h; j++)
      out.push(grid.cellOf([x + (i - (w - 1) / 2) * GRID, z + (j - (h - 1) / 2) * GRID]))
  return out
}

describe('BOARD_DENSITY', () => {
  it('lite : aucun petit composant, moins d’impulsions que full', () => {
    expect(BOARD_DENSITY.lite.passives).toBe(0)
    expect(BOARD_DENSITY.lite.pulses).toBeLessThan(BOARD_DENSITY.full.pulses)
    expect(BOARD_DENSITY.reduced.passives).toBeLessThan(BOARD_DENSITY.full.passives)
  })
})

describe('scatterPassives', () => {
  it('au plus `count`, jamais sur une cellule bloquée, deux à deux disjoints', () => {
    const grid = new RoutingGrid(board)
    grid.block({ minX: -1, minZ: -1, maxX: 1, maxZ: 1 })
    const out = scatterPassives(grid, 40, SEED)
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThanOrEqual(40)
    const seen = new Set<string>()
    for (const p of out) {
      for (const cell of cellsOf(grid, p)) {
        expect(grid.isFree(cell)).toBe(true)
        const key = cell.join(',')
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
  })

  it('garde une cellule de dégagement autour de chaque composant', () => {
    const grid = new RoutingGrid(board)
    grid.block({ minX: -1, minZ: -1, maxX: 1, maxZ: 1 })
    const out = scatterPassives(grid, 40, SEED)
    const owner = new Map<string, number>()
    out.forEach((p, i) => cellsOf(grid, p).forEach((c) => owner.set(c.join(','), i)))
    out.forEach((p, i) => {
      for (const [c, r] of cellsOf(grid, p))
        for (let dc = -1; dc <= 1; dc++)
          for (let dr = -1; dr <= 1; dr++) {
            const o = owner.get(`${c + dc},${r + dr}`)
            expect(o === undefined || o === i).toBe(true)
            expect(grid.isFree([c + dc, r + dr])).toBe(true)
          }
    })
  })

  it('refs R1… / C1…, kinds mêlés, même graine → même sortie', () => {
    const grid = new RoutingGrid(board)
    const a = scatterPassives(grid, 30, SEED)
    expect(scatterPassives(grid, 30, SEED)).toEqual(a)
    expect(scatterPassives(grid, 30, SEED + 1)).not.toEqual(a)
    const rs = a.filter((p) => p.kind === 'resistor').map((p) => p.ref)
    const cs = a.filter((p) => p.kind === 'capacitor').map((p) => p.ref)
    expect(rs).toEqual(rs.map((_, i) => `R${i + 1}`))
    expect(cs).toEqual(cs.map((_, i) => `C${i + 1}`))
    expect(rs.length).toBeGreaterThan(0)
    expect(cs.length).toBeGreaterThan(0)
    expect(a.some((p) => p.rotated)).toBe(true)
    expect(a.some((p) => !p.rotated)).toBe(true)
  })

  it('count 0 ou grille pleine : rien', () => {
    const grid = new RoutingGrid(board)
    expect(scatterPassives(grid, 0, SEED)).toEqual([])
    grid.block(board)
    expect(scatterPassives(grid, 10, SEED)).toEqual([])
  })

  it('ne modifie pas la grille', () => {
    const grid = new RoutingGrid(board)
    grid.block({ minX: -1, minZ: -1, maxX: 1, maxZ: 1 })
    const snapshot = () => {
      const out: boolean[] = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) out.push(grid.isFree([c, r]))
      return out
    }
    const before = snapshot()
    scatterPassives(grid, 30, SEED)
    expect(snapshot()).toEqual(before)
  })

  it('laisse libres les rectangles réservés aux étiquettes', () => {
    const grid = new RoutingGrid(board)
    const anchors: Vec2[] = [
      [0, 0],
      [-3, 3],
    ]
    const keepOut = anchors.map(labelKeepOut)
    const out = scatterPassives(grid, 200, SEED, anchors)
    expect(out.length).toBeGreaterThan(0)
    for (const p of out) {
      const box = rectOf(p.center, p.rotated ? GRID : 2 * GRID, p.rotated ? 2 * GRID : GRID)
      expect(keepOut.some((k) => rectsOverlap(box, k))).toBe(false)
    }
    // Des ancres qui pavent toute la carte : plus aucune place.
    const everywhere: Vec2[] = []
    for (let x = board.minX; x <= board.maxX; x += 1.5)
      for (let z = board.minZ; z <= board.maxZ; z += 0.5) everywhere.push([x, z])
    expect(scatterPassives(grid, 200, SEED, everywhere)).toEqual([])
  })
})
