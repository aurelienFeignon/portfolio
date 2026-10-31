import { describe, expect, it } from 'vitest'
import { SKILL_FAMILIES } from '@/scene/state/board/content'
import { planDistrict } from '@/scene/state/board/processors'
import { rectsOverlap } from '@/scene/state/board/rect'
import { type Rect } from '@/scene/state/plane'
import {
  CHIP_GAP,
  chipDimensions,
  DIRECTIONS,
  planZones,
  ZONE_GAP,
  ZONE_PADDING,
  ZONE_WIDTH,
} from '@/scene/state/board/zones'
import { TONES } from '@/scene/state/layout'
import {
  makeBoardProject,
  makeBoardSkill,
  makeLargeBoard,
  makeRealSizeBoard,
} from '../../../fixtures/builders/board'
import { rectContains } from './geometry-asserts'

const EPS = 1e-6
const chipRect = (c: { center: readonly [number, number]; size: number }): Rect => ({
  minX: c.center[0] - c.size / 2,
  maxX: c.center[0] + c.size / 2,
  minZ: c.center[1] - c.size / 2,
  maxZ: c.center[1] + c.size / 2,
})
/** `inner` tient dans `outer`, bornes comprises, à `EPS` près. */
const inside = (inner: Rect, outer: Rect) =>
  rectContains(outer, [inner.minX, inner.minZ], { margin: EPS }) &&
  rectContains(outer, [inner.maxX, inner.maxZ], { margin: EPS })

function district(n: number): Rect {
  const projects = Array.from({ length: n }, (_, i) =>
    makeBoardProject({
      slug: `proj-${String(i + 1).padStart(2, '0')}`,
      startedAt: `${2000 + i}`,
      primary: i === 0,
    }),
  )
  return planDistrict(projects).bounds
}

const cases = [
  ['taille réelle, 3 projets', makeRealSizeBoard().skills, district(3)],
  ['taille réelle, quartier de 20', makeRealSizeBoard().skills, district(20)],
  ['grand banc, quartier de 20', makeLargeBoard().skills, district(20)],
] as const

describe('chipDimensions', () => {
  it('level : croît strictement avec le niveau', () => {
    for (const l of [1, 2, 3, 4] as const) {
      const a = chipDimensions(l, 'level')
      const b = chipDimensions((l + 1) as 2 | 3 | 4 | 5, 'level')
      expect(b.size).toBeGreaterThan(a.size)
      expect(b.height).toBeGreaterThan(a.height)
    }
  })
  it('uniform : constant', () => {
    for (const l of [1, 2, 3, 4, 5] as const) {
      expect(chipDimensions(l, 'uniform')).toEqual({ size: 0.9, height: 0.2 })
    }
  })
})

describe('TONES', () => {
  it('une teinte par famille au moins : `planZones` n’en manque jamais', () => {
    expect(TONES.length).toBeGreaterThanOrEqual(SKILL_FAMILIES.length)
  })
})

describe('DIRECTIONS', () => {
  it('une direction par famille au moins : `planZones` n’en manque jamais', () => {
    expect(DIRECTIONS.length).toBeGreaterThanOrEqual(SKILL_FAMILIES.length)
    expect(new Set(DIRECTIONS).size).toBe(DIRECTIONS.length)
  })
})

describe.each(cases)('planZones — %s', (_name, skills, d) => {
  for (const sizing of ['level', 'uniform'] as const) {
    describe(sizing, () => {
      const zones = planZones(skills, d, sizing)

      it('une puce par compétence, dans sa zone, sans débord', () => {
        const chips = zones.flatMap((z) => z.chips)
        expect(chips.map((c) => c.slug).sort()).toEqual(skills.map((s) => s.slug).sort())
        for (const z of zones) {
          for (const c of z.chips) {
            expect(c.family).toBe(z.family)
            expect(c.tone).toBe(z.tone)
            expect(inside(chipRect(c), z.bounds)).toBe(true)
          }
        }
      })
      it('les puces sont écartées de CHIP_GAP', () => {
        for (const z of zones) {
          z.chips.forEach((a, i) =>
            z.chips.slice(i + 1).forEach((b) => {
              expect(rectsOverlap(chipRect(a), chipRect(b), CHIP_GAP - EPS)).toBe(false)
            }),
          )
        }
      })
      it('zones et quartier séparés de ZONE_GAP', () => {
        zones.forEach((a, i) => {
          expect(rectsOverlap(a.bounds, d, ZONE_GAP - EPS)).toBe(false)
          zones.slice(i + 1).forEach((b) => {
            expect(rectsOverlap(a.bounds, b.bounds, ZONE_GAP - EPS)).toBe(false)
          })
        })
      })
      it('aucune zone devant le quartier', () => {
        for (const z of zones) expect(z.bounds.maxZ).toBeLessThanOrEqual(d.maxZ + EPS)
      })
      it('refs IC1… uniques et contiguës', () => {
        const refs = zones.flatMap((z) => z.chips.map((c) => c.ref))
        expect(refs).toEqual(refs.map((_, i) => `IC${i + 1}`))
      })
      it('exit sur le bord tourné vers le quartier, labelAnchor derrière la zone', () => {
        for (const z of zones) {
          const [ex, ez] = z.exit
          expect(ex >= z.bounds.minX - EPS && ex <= z.bounds.maxX + EPS).toBe(true)
          expect(ez >= z.bounds.minZ - EPS && ez <= z.bounds.maxZ + EPS).toBe(true)
          expect(z.labelAnchor[1]).toBeLessThan(z.bounds.minZ)
        }
      })
    })
  }

  it('étagères triées par taille décroissante en mode level', () => {
    for (const z of planZones(skills, d, 'level')) {
      const sizes = z.chips.map((c) => c.size)
      expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
    }
  })
})

describe('planZones — règles', () => {
  const d = district(3)
  it('famille vide : pas de zone ; ton fixe par famille', () => {
    const skills = [
      makeBoardSkill({ slug: 'a', family: 'practice' }),
      makeBoardSkill({ slug: 'b', family: 'framework' }),
    ]
    const zones = planZones(skills, d, 'uniform')
    expect(zones.map((z) => z.family).sort()).toEqual(['framework', 'practice'])
    for (const z of zones) {
      expect(z.tone).toBe(TONES[SKILL_FAMILIES.indexOf(z.family)])
    }
  })
  it('aucune compétence : aucune zone', () => {
    expect(planZones([], d, 'level')).toEqual([])
  })
  it('la zone la plus peuplée prend l’ouest, la suivante l’est', () => {
    const zones = planZones(makeRealSizeBoard().skills, d, 'uniform')
    expect(zones[0]!.family).toBe('framework')
    expect(zones[0]!.bounds.maxX).toBeLessThan(d.minX)
    expect(zones[1]!.bounds.minX).toBeGreaterThan(d.maxX)
  })
  it('égalité : ordre de SKILL_FAMILIES', () => {
    const skills = [
      makeBoardSkill({ slug: 'a', family: 'practice' }),
      makeBoardSkill({ slug: 'b', family: 'language' }),
    ]
    expect(planZones(skills, d, 'uniform').map((z) => z.family)).toEqual(['language', 'practice'])
  })
  it('largeur de zone ZONE_WIDTH et puces dans le remplissage', () => {
    const z = planZones(makeRealSizeBoard().skills, d, 'uniform')[0]!
    expect(z.bounds.maxX - z.bounds.minX).toBeCloseTo(ZONE_WIDTH)
    for (const c of z.chips) {
      expect(chipRect(c).minX).toBeGreaterThanOrEqual(z.bounds.minX + ZONE_PADDING - EPS)
    }
  })
  it('déterministe, indépendant de l’ordre d’entrée', () => {
    const skills = makeRealSizeBoard().skills
    expect(planZones([...skills].reverse(), d, 'level')).toEqual(planZones(skills, d, 'level'))
  })
})
