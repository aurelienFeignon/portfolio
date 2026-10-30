import { describe, expect, it } from 'vitest'
import { makeLargeBoard, makeRealSizeBoard } from '../../../fixtures/builders/board'
import { BOARD_DENSITY, labelKeepOut } from '@/scene/state/board/passives'
import { BOARD_SEED, type BoardOptions, planBoard } from '@/scene/state/board/plan'
import { GRID } from '@/scene/state/board/grid'
import { inflate, type Rect, rectOf, rectsOverlap, type Vec2 } from '@/scene/state/board/rect'

const options: BoardOptions = { currentYear: 2026, chipSizing: 'level', tier: 'full' }
const inside = (b: Rect, [x, z]: Vec2) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ
const within = (b: Rect, r: Rect) => inside(b, [r.minX, r.minZ]) && inside(b, [r.maxX, r.maxZ])

describe('planBoard', () => {
  it('BOARD_SEED est une graine fixe', () => {
    expect(BOARD_SEED).toBe(0x0b0a12d)
  })

  it('déterminisme : une entrée permutée donne le même plan', { timeout: 30_000 }, () => {
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

  it('tout tient dans bounds, le bus est devant', { timeout: 30_000 }, () => {
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

  it(
    'banc de taille réelle : bus de famille, 5 ponts (chiffre de §11)',
    { timeout: 30_000 },
    () => {
      const plan = planBoard(makeRealSizeBoard(), options)
      expect(plan.traces.mode).toBe('family-bus')
      expect(plan.traces.unrouted).toEqual([])
      expect(plan.traces.vias).toHaveLength(5)
    },
  )

  it('budgets recomptés depuis les données', { timeout: 30_000 }, () => {
    const c = makeRealSizeBoard()
    for (const tier of ['full', 'reduced', 'lite'] as const) {
      const plan = planBoard(c, { ...options, tier })
      expect(plan.zones.reduce((n, z) => n + z.chips.length, 0)).toBe(c.skills.length)
      expect(plan.district.processors.length).toBe(c.projects.length)
      expect(plan.passives.length).toBeLessThanOrEqual(BOARD_DENSITY[tier].passives)
      expect(plan.pulses).toBe(BOARD_DENSITY[tier].pulses)
    }
  })

  it(
    'les paliers ne changent que les petits composants et les impulsions',
    { timeout: 30_000 },
    () => {
      const c = makeRealSizeBoard()
      const full = planBoard(c, options)
      const lite = planBoard(c, { ...options, tier: 'lite' })
      expect(lite.passives).toEqual([])
      expect(lite.pulses).toBeLessThan(full.pulses)
      expect(lite.zones).toEqual(full.zones)
      expect(lite.district).toEqual(full.district)
      expect(lite.traces).toEqual(full.traces)
      expect(full.passives.length).toBeGreaterThan(0)
    },
  )

  it('une expérience en retard sur l’horloge est quand même couverte', { timeout: 30_000 }, () => {
    const c = makeRealSizeBoard()
    const plan = planBoard(c, { ...options, currentYear: 1990 })
    const starts = c.experiences.map((e) => e.startYear)
    expect(plan.timeline.firstYear).toBeLessThanOrEqual(Math.min(...starts))
    expect(plan.timeline.lastYear).toBeGreaterThanOrEqual(Math.max(...starts))
  })

  it('les petits composants évitent puces, processeurs, bus et pistes', { timeout: 30_000 }, () => {
    const plan = planBoard(makeRealSizeBoard(), options)
    expect(plan.passives.length).toBeGreaterThan(0)
    const boxes: Rect[] = [
      ...plan.zones.flatMap((z) => z.chips.map((c) => rectOf(c.center, c.size, c.size))),
      ...plan.district.processors.map((p) => rectOf(p.center, p.size, p.size)),
      plan.timeline.bounds,
    ]
    // Les pistes, échantillonnées au quart de cellule.
    const samples: Vec2[] = []
    for (const route of plan.traces.routes)
      for (let i = 1; i < route.points.length; i++) {
        const [ax, az] = route.points[i - 1]!
        const [bx, bz] = route.points[i]!
        const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (GRID / 4))
        for (let k = 0; k <= n; k++)
          samples.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n])
      }
    expect(samples.length).toBeGreaterThan(0)
    for (const p of plan.passives) {
      const box = rectOf(p.center, p.rotated ? GRID : 2 * GRID, p.rotated ? 2 * GRID : GRID)
      expect(boxes.some((other) => rectsOverlap(box, other))).toBe(false)
      // Une cellule de dégagement : un échantillon pile sur le bord du halo (sommet
      // d'une diagonale au coin d'une cellule voisine) n'est pas un contact.
      const halo = inflate(box, GRID - 1e-6)
      expect(samples.some((s) => inside(halo, s))).toBe(false)
    }
  })

  it('les petits composants laissent libres les ancres d’étiquettes', { timeout: 30_000 }, () => {
    for (const content of [makeRealSizeBoard(), makeLargeBoard()]) {
      const plan = planBoard(content, options)
      const anchors: Vec2[] = [
        ...plan.district.processors.map((p) => p.labelAnchor),
        ...plan.zones.map((z) => z.labelAnchor),
        ...plan.timeline.segments.map((s) => s.labelAnchor),
      ]
      const keepOut = anchors.map(labelKeepOut)
      expect(plan.passives.length).toBeGreaterThan(0)
      for (const p of plan.passives) {
        const box = rectOf(p.center, p.rotated ? GRID : 2 * GRID, p.rotated ? 2 * GRID : GRID)
        expect(keepOut.some((k) => rectsOverlap(box, k))).toBe(false)
      }
    }
  })

  it('grand contenu : passe, sans petit composant hors budget', { timeout: 30_000 }, () => {
    const plan = planBoard(makeLargeBoard(), options)
    expect(plan.passives.length).toBeLessThanOrEqual(BOARD_DENSITY.full.passives)
    // Épinglé : le chiffre que cite `carte-mere.md` §11 (bancs, pas contenu réel).
    expect(plan.traces.mode).toBe('family-bus')
    expect(plan.traces.vias).toHaveLength(170)
  })
})
