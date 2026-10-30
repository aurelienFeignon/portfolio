import { describe, expect, it } from 'vitest'
import {
  choosePrimary,
  DISTRICT_MARGIN,
  planDistrict,
  PRIMARY_SIZE,
  SECONDARY_SIZE,
  SLOT_PITCH,
} from '@/scene/state/board/processors'
import { rectOf, rectsOverlap } from '@/scene/state/board/rect'
import { makeBoardProject } from '../../../fixtures/builders/board'

function projects(n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeBoardProject({
      slug: `proj-${String(i + 1).padStart(2, '0')}`,
      startedAt: `${2000 + i}`,
      primary: i === 0,
    }),
  )
}

describe('choosePrimary', () => {
  it('retourne le projet désigné', () => {
    const list = [makeBoardProject({ slug: 'a' }), makeBoardProject({ slug: 'b', primary: true })]
    expect(choosePrimary(list)?.slug).toBe('b')
  })
  it('plusieurs principaux : le premier par slug', () => {
    const list = [
      makeBoardProject({ slug: 'z', primary: true }),
      makeBoardProject({ slug: 'm', primary: true }),
    ]
    expect(choosePrimary(list)?.slug).toBe('m')
  })
  it('aucun principal : le plus récent, puis le slug', () => {
    const list = [
      makeBoardProject({ slug: 'a', startedAt: '2024' }),
      makeBoardProject({ slug: 'b', startedAt: '2025-01-02' }),
    ]
    expect(choosePrimary(list)?.slug).toBe('b')
    const tie = [
      makeBoardProject({ slug: 'y', startedAt: '2024-03' }),
      makeBoardProject({ slug: 'x', startedAt: '2024-03' }),
    ]
    expect(choosePrimary(tie)?.slug).toBe('x')
  })
  it('précisions mixtes à préfixe commun : la plus précise compte comme plus tardive', () => {
    const a = [
      makeBoardProject({ slug: 'a', startedAt: '2024-06' }),
      makeBoardProject({ slug: 'b', startedAt: '2024' }),
    ]
    expect(choosePrimary(a)?.slug).toBe('a')
    const b = [
      makeBoardProject({ slug: 'a', startedAt: '2024-06' }),
      makeBoardProject({ slug: 'b', startedAt: '2024-06-15' }),
    ]
    expect(choosePrimary(b)?.slug).toBe('b')
  })
  it('doublons de slug : déterministe, sans exception', () => {
    const list = [makeBoardProject({ slug: 'd' }), makeBoardProject({ slug: 'd' })]
    expect(choosePrimary(list)?.slug).toBe('d')
    expect(planDistrict(list).processors.map((p) => p.ref)).toEqual(['U1', 'U2'])
  })
  it('liste vide : null', () => {
    expect(choosePrimary([])).toBeNull()
  })
})

describe('planDistrict', () => {
  it('sans projet : carré de côté 4 centré, aucun processeur', () => {
    const d = planDistrict([])
    expect(d.processors).toEqual([])
    expect(d.bounds).toEqual({ minX: -2, minZ: -2, maxX: 2, maxZ: 2 })
  })

  it('le principal est au centre, plus grand que tout secondaire', () => {
    const d = planDistrict(projects(5))
    const [first, ...rest] = d.processors
    expect(first).toMatchObject({ slug: 'proj-01', primary: true, ref: 'U1', center: [0, 0] })
    expect(first!.size).toBe(PRIMARY_SIZE)
    for (const p of rest) {
      expect(p.size).toBe(SECONDARY_SIZE)
      expect(p.size).toBeLessThan(first!.size)
    }
  })

  it.each([1, 3, 9, 20, 50])('aucun recouvrement (écart ≥ 0,5) pour %i projets', (n) => {
    const ps = planDistrict(projects(n)).processors
    expect(ps).toHaveLength(n)
    for (let i = 0; i < ps.length; i += 1) {
      for (let j = i + 1; j < ps.length; j += 1) {
        const a = rectOf(ps[i]!.center, ps[i]!.size, ps[i]!.size)
        const b = rectOf(ps[j]!.center, ps[j]!.size, ps[j]!.size)
        expect(rectsOverlap(a, b, 0.5)).toBe(false)
      }
    }
  })

  it("l'anneau 1 suit l'ordre O, E, N, NO, NE, SO, SE, S, puis l'anneau 2 s'ouvre", () => {
    const ps = planDistrict(projects(10)).processors
    const cells = ps.slice(1).map((p) => [p.center[0] / SLOT_PITCH, p.center[1] / SLOT_PITCH])
    expect(cells.slice(0, 8)).toEqual([
      [-1, 0],
      [1, 0],
      [0, -1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
      [0, 1],
    ])
    // Le 9e secondaire ouvre l'anneau 2 (distance de Tchebychev 2).
    const ninth = ps[9]!.center
    expect(Math.max(Math.abs(ninth[0]), Math.abs(ninth[1])) / SLOT_PITCH).toBe(2)
  })

  it("l'anneau 2 compte 16 cases distinctes, le sud en dernier", () => {
    const ps = planDistrict(projects(1 + 8 + 16 + 1)).processors
    const ring2 = ps.slice(9, 25).map((p) => `${p.center[0]},${p.center[1]}`)
    expect(new Set(ring2).size).toBe(16)
    expect(ring2[15]).toBe(`0,${2 * SLOT_PITCH}`)
    expect(
      Math.max(Math.abs(ps[25]!.center[0]), Math.abs(ps[25]!.center[1])) / SLOT_PITCH,
    ).toBeCloseTo(3, 9)
  })

  it('les secondaires sont triés par date décroissante puis slug', () => {
    const list = [
      makeBoardProject({ slug: 'main', primary: true }),
      makeBoardProject({ slug: 'b', startedAt: '2023' }),
      makeBoardProject({ slug: 'a', startedAt: '2023' }),
      makeBoardProject({ slug: 'c', startedAt: '2025-01-02' }),
    ]
    expect(planDistrict(list).processors.map((p) => p.slug)).toEqual(['main', 'c', 'a', 'b'])
  })

  it('secondaires : précisions mixtes à préfixe commun et dates égales', () => {
    const list = [
      makeBoardProject({ slug: 'main', primary: true }),
      makeBoardProject({ slug: 'y', startedAt: '2024' }),
      makeBoardProject({ slug: 'x', startedAt: '2024-06' }),
      makeBoardProject({ slug: 'w', startedAt: '2024-06-15' }),
      makeBoardProject({ slug: 'v', startedAt: '2024-06' }),
    ]
    expect(planDistrict(list).processors.map((p) => p.slug)).toEqual(['main', 'w', 'v', 'x', 'y'])
  })

  it("l'anneau 2 s'ouvre dans l'ordre exact des cases", () => {
    const ps = planDistrict(projects(1 + 8 + 16)).processors
    const cells = ps.slice(9).map((p) => [p.center[0] / SLOT_PITCH, p.center[1] / SLOT_PITCH])
    const expected = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [-1, -2],
      [1, -2],
      [-2, -2],
      [-2, -1],
      [2, -2],
      [2, -1],
      [-2, 1],
      [-2, 2],
      [2, 1],
      [2, 2],
      [-1, 2],
      [1, 2],
      [0, 2],
    ]
    cells.forEach((c, i) => {
      expect(c[0]).toBeCloseTo(expected[i]![0]!, 9)
      expect(c[1]).toBeCloseTo(expected[i]![1]!, 9)
    })
  })

  it('les ref sont U1…Un sans trou', () => {
    const ps = planDistrict(projects(12)).processors
    expect(ps.map((p) => p.ref)).toEqual(Array.from({ length: 12 }, (_, i) => `U${i + 1}`))
  })

  it("tolère l'absence de principal désigné (repli sur le plus récent)", () => {
    const list = [
      makeBoardProject({ slug: 'old', startedAt: '2020' }),
      makeBoardProject({ slug: 'new', startedAt: '2025' }),
    ]
    const ps = planDistrict(list).processors
    expect(ps[0]).toMatchObject({ slug: 'new', primary: true, center: [0, 0] })
  })

  it("l'ancre d'étiquette est derrière le processeur (Z plus petit)", () => {
    for (const p of planDistrict(projects(4)).processors) {
      expect(p.labelAnchor[0]).toBe(p.center[0])
      expect(p.labelAnchor[1]).toBeLessThan(p.center[1] - p.size / 2)
      expect(p.height).toBeGreaterThan(0)
    }
  })

  it('bounds = boîte des processeurs + marge', () => {
    const d = planDistrict(projects(1))
    const h = PRIMARY_SIZE / 2 + DISTRICT_MARGIN
    expect(d.bounds).toEqual({ minX: -h, minZ: -h, maxX: h, maxZ: h })
  })
})
