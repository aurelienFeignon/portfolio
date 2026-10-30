import { describe, expect, it } from 'vitest'
import {
  makeBoardContent,
  makeLargeBoard,
  makeRealSizeBoard,
} from '../../../fixtures/builders/board'
import { BOARD_DENSITY } from '@/scene/state/board/passives'
import { BOARD_SEED, type BoardOptions, planBoard } from '@/scene/state/board/plan'
import type { Rect, Vec2 } from '@/scene/state/board/rect'

const options: BoardOptions = { currentYear: 2026, chipSizing: 'level', tier: 'full' }
const inside = (b: Rect, [x, z]: Vec2) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ
const within = (b: Rect, r: Rect) => inside(b, [r.minX, r.minZ]) && inside(b, [r.maxX, r.maxZ])

describe('planBoard', () => {
  it('BOARD_SEED est une graine fixe', () => {
    expect(BOARD_SEED).toBe(0x0b0a12d)
  })

  it('déterminisme : une entrée permutée donne le même plan', () => {
    const c = makeRealSizeBoard()
    const shuffled = {
      skills: [...c.skills].reverse(),
      experiences: [...c.experiences].reverse(),
      projects: [...c.projects].reverse(),
    }
    expect(planBoard(shuffled, options)).toEqual(planBoard(c, options))
  })

  it('contenu creux : un plan valide, sans zone ni processeur, une frise éteinte', () => {
    const plan = planBoard({ skills: [], experiences: [], projects: [] }, options)
    expect(plan.zones).toEqual([])
    expect(plan.district.processors).toEqual([])
    expect(plan.timeline.segments).toEqual([])
    expect(plan.timeline.firstYear).toBe(2026)
    expect(plan.timeline.lastYear).toBe(2026)
    expect(plan.traces.routes).toEqual([])
    expect(Number.isFinite(plan.bounds.minX)).toBe(true)
  })

  it('tout tient dans bounds, le bus est devant', () => {
    const c = makeRealSizeBoard()
    const plan = planBoard(c, options)
    for (const z of plan.zones) {
      expect(within(plan.bounds, z.bounds)).toBe(true)
      expect(plan.timeline.bounds.minZ).toBeGreaterThan(z.bounds.maxZ)
      for (const chip of z.chips) expect(inside(plan.bounds, chip.center)).toBe(true)
    }
    expect(within(plan.bounds, plan.district.bounds)).toBe(true)
    expect(plan.timeline.bounds.minZ).toBeGreaterThan(plan.district.bounds.maxZ)
    expect(within(plan.bounds, plan.timeline.bounds)).toBe(true)
    for (const r of plan.traces.routes)
      for (const p of r.points) expect(inside(plan.bounds, p)).toBe(true)
    for (const p of plan.passives) expect(inside(plan.bounds, p.center)).toBe(true)
  })

  it('budgets recomptés depuis les données', () => {
    const c = makeRealSizeBoard()
    for (const tier of ['full', 'reduced', 'lite'] as const) {
      const plan = planBoard(c, { ...options, tier })
      expect(plan.zones.reduce((n, z) => n + z.chips.length, 0)).toBe(c.skills.length)
      expect(plan.district.processors.length).toBe(c.projects.length)
      expect(plan.passives.length).toBeLessThanOrEqual(BOARD_DENSITY[tier].passives)
      expect(plan.pulses).toBe(BOARD_DENSITY[tier].pulses)
    }
  })

  it('les paliers ne changent que les petits composants et les impulsions', () => {
    const c = makeRealSizeBoard()
    const full = planBoard(c, options)
    const lite = planBoard(c, { ...options, tier: 'lite' })
    expect(lite.passives).toEqual([])
    expect(lite.pulses).toBeLessThan(full.pulses)
    expect(lite.zones).toEqual(full.zones)
    expect(lite.district).toEqual(full.district)
    expect(lite.traces).toEqual(full.traces)
    expect(full.passives.length).toBeGreaterThan(0)
  })

  it('une expérience en retard sur l’horloge est quand même couverte', () => {
    const c = makeBoardContent({})
    expect(() => planBoard(c, { ...options, currentYear: 1990 })).not.toThrow()
  })

  it('grand contenu : passe, sans petit composant hors budget', () => {
    const plan = planBoard(makeLargeBoard(), options)
    expect(plan.passives.length).toBeLessThanOrEqual(BOARD_DENSITY.full.passives)
  }, 30_000)
})
