import { describe, expect, it } from 'vitest'
import {
  makeBoardContent,
  makeLargeBoard,
  makeRealSizeBoard,
} from '../../../fixtures/builders/board'
import { buildBoardFile } from '@/scene/state/board/file'
import type { BusJog, Timeline } from '@/scene/state/board/timeline'
import type { Route } from '@/scene/state/board/traces'
import type { Vec2 } from '@/scene/state/board/rect'
import {
  boardMeshes,
  busRibbons,
  drawCallBudget,
  FIXED_MESHES,
  hexToLinear,
  instances,
  MAX_DRAW_CALLS,
  routeTones,
  SHAPES,
  traceRibbons,
  traceWidth,
  withJog,
} from '@/scene/state/board-render/geometry'
import { BOARD_DENSITY, BUS_WIRES, PALETTE, TONES } from '@/scene/state/layout'

const real = buildBoardFile(makeRealSizeBoard(), {
  locale: 'fr',
  year: 2026,
  chipSizing: 'uniform',
})
const large = buildBoardFile(makeLargeBoard(), { locale: 'fr', year: 2026, chipSizing: 'uniform' })
const small = buildBoardFile(makeBoardContent(), {
  locale: 'fr',
  year: 2026,
  chipSizing: 'uniform',
})

/** Aire (non signée) du triangle de sommets `a`, `b`, `c` lus dans `positions` (x, y, z). */
function triangleArea(positions: Float32Array, a: number, b: number, c: number): number {
  const ax = positions[a * 3]!
  const az = positions[a * 3 + 2]!
  const ux = positions[b * 3]! - ax
  const uz = positions[b * 3 + 2]! - az
  const vx = positions[c * 3]! - ax
  const vz = positions[c * 3 + 2]! - az
  return Math.abs(ux * vz - uz * vx) / 2
}

const route = (points: Vec2[], net = 'n'): Route => ({ net, kind: 'link', links: [], points })

describe('traceRibbons', () => {
  const routes = real.plan.traces.routes
  const ribbons = traceRibbons(routes, 0.1)
  const points = routes.reduce((sum, r) => sum + r.points.length, 0)

  it('toutes les pistes en une géométrie : deux sommets par point', () => {
    expect(ribbons.positions.length).toBe(points * 2 * 3)
    expect(ribbons.routeIndex.length).toBe(points * 2)
    expect(ribbons.along.length).toBe(points * 2)
    expect(ribbons.across.length).toBe(points * 2)
  })

  it('deux triangles par tronçon, aucun de surface nulle', () => {
    const edges = routes.reduce((sum, r) => sum + r.points.length - 1, 0)
    expect(ribbons.indices.length).toBe(edges * 6)
    for (let i = 0; i < ribbons.indices.length; i += 3) {
      const area = triangleArea(
        ribbons.positions,
        ribbons.indices[i]!,
        ribbons.indices[i + 1]!,
        ribbons.indices[i + 2]!,
      )
      expect(area).toBeGreaterThan(1e-6)
    }
  })

  it('chaque triangle regarde vers le haut (+Y) : la caméra voit la face, pas le dos élagué', () => {
    for (let i = 0; i < ribbons.indices.length; i += 3) {
      const [a, b, c] = [ribbons.indices[i]!, ribbons.indices[i + 1]!, ribbons.indices[i + 2]!]
      const p = ribbons.positions
      const ux = p[b * 3]! - p[a * 3]!
      const uz = p[b * 3 + 2]! - p[a * 3 + 2]!
      const vx = p[c * 3]! - p[a * 3]!
      const vz = p[c * 3 + 2]! - p[a * 3 + 2]!
      // Composante Y du produit vectoriel u × v.
      expect(uz * vx - ux * vz).toBeGreaterThan(0)
    }
  })

  it('routeIndex couvre chaque route, dans l’ordre du plan', () => {
    const seen = new Set(ribbons.routeIndex)
    expect([...seen].sort((a, b) => a - b)).toEqual(routes.map((_, i) => i))
    expect(ribbons.routeIndex[0]).toBe(0)
    expect(ribbons.routeIndex.at(-1)).toBe(routes.length - 1)
  })

  it('le ruban est à plat, centré sur la polyligne, de la largeur demandée', () => {
    const r = traceRibbons(
      [
        route([
          [0, 0],
          [2, 0],
        ]),
      ],
      0.1,
    )
    expect([...r.positions]).toEqual(
      [0, 0, 0.05, 0, 0, -0.05, 2, 0, 0.05, 2, 0, -0.05].map(Math.fround),
    )
    expect([...r.across]).toEqual([1, -1, 1, -1])
    expect([...r.along]).toEqual([0, 0, 2, 2])
  })

  it('un coude garde la largeur : joint biseauté à 45°', () => {
    const r = traceRibbons(
      [
        route([
          [0, 0],
          [1, 0],
          [2, 1],
        ]),
      ],
      0.2,
    )
    // Le sommet du coude est décalé le long de la bissectrice, de w/2 / cos(22,5°).
    const dx = r.positions[6]! - 1
    const dz = r.positions[8]! - 0
    expect(Math.hypot(dx, dz)).toBeCloseTo(0.1 / Math.cos(Math.PI / 8), 6)
  })

  it('un demi-tour à 135° reste borné (pas de pointe infinie)', () => {
    const r = traceRibbons(
      [
        route([
          [0, 0],
          [1, 0],
          [0, 0.01],
        ]),
      ],
      0.2,
    )
    const dx = r.positions[6]! - 1
    const dz = r.positions[8]!
    expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(0.1 * 4 + 1e-6)
  })

  it('les points répétés sont fusionnés, une route dégénérée ne produit rien', () => {
    const r = traceRibbons(
      [
        route([
          [0, 0],
          [0, 0],
          [1, 0],
        ]),
        route([
          [3, 3],
          [3, 3],
        ]),
        route([
          [5, 5],
          [6, 5],
        ]),
      ],
      0.1,
    )
    expect(r.positions.length).toBe(4 * 3 * 2)
    expect([...new Set(r.routeIndex)]).toEqual([0, 2])
  })
})

describe('traceWidth', () => {
  it('un tronc est plus large qu’une prise au bus, plus large qu’une liaison : pas de tubes uniformes', () => {
    const of = (kind: Route['kind']) =>
      traceWidth({
        ...route([
          [0, 0],
          [1, 0],
        ]),
        kind,
      })
    expect(of('trunk')).toBeGreaterThan(of('bus-link'))
    expect(of('bus-link')).toBeGreaterThan(of('link'))
  })

  it('traceRibbons accepte une largeur par route', () => {
    const routes = [
      {
        ...route([
          [0, 0],
          [1, 0],
        ]),
        kind: 'trunk' as const,
      },
      route([
        [0, 5],
        [1, 5],
      ]),
    ]
    const r = traceRibbons(routes, traceWidth)
    const halfOf = (v: number) => Math.abs(r.positions[v * 3 + 2]! - (v < 4 ? 0 : 5))
    expect(halfOf(0)).toBeCloseTo(traceWidth(routes[0]!) / 2, 6)
    expect(halfOf(4)).toBeCloseTo(traceWidth(routes[1]!) / 2, 6)
  })
})

describe('busRibbons', () => {
  const timeline = real.plan.timeline
  const bus = busRibbons(timeline)

  it(`chaque tronçon est un faisceau de ${BUS_WIRES} fils, segmentIndex par sommet`, () => {
    timeline.segments.forEach((segment, s) => {
      const count = bus.segmentIndex.filter((value) => value === s).length
      expect(count).toBe(segment.points.length * 2 * BUS_WIRES)
    })
    expect(bus.positions.length / 3).toBe(bus.segmentIndex.length)
    expect(bus.idle.length).toBe(bus.segmentIndex.length)
  })

  it('les fils d’une voie restent dans leur voie (pas de recouvrement entre voies)', () => {
    let maxOffset = 0
    for (let v = 0; v < bus.segmentIndex.length; v++) {
      const z = bus.positions[v * 3 + 2]!
      const x = bus.positions[v * 3]!
      // Sur le tronçon droit de la voie 0, en dehors des pentes.
      if (bus.segmentIndex[v] === 0 && x < 0)
        maxOffset = Math.max(maxOffset, Math.abs(z - timeline.originZ))
    }
    expect(maxOffset).toBeGreaterThan(0.1)
    expect(maxOffset).toBeLessThan(0.45)
  })

  it('aucun fil de longueur nulle', () => {
    for (let i = 0; i < bus.indices.length; i += 3) {
      expect(
        triangleArea(bus.positions, bus.indices[i]!, bus.indices[i + 1]!, bus.indices[i + 2]!),
      ).toBeGreaterThan(1e-7)
    }
  })

  it('une année sans poste est une voie éteinte : idle = 1, hors de tout tronçon', () => {
    const quiet = buildBoardFile(
      makeBoardContent({
        experiences: [
          { slug: 'exp-a', startYear: 2018, endYear: 2019 },
          { slug: 'exp-b', startYear: 2022, endYear: null },
        ],
      }),
      { locale: 'fr', year: 2026, chipSizing: 'uniform' },
    ).plan.timeline
    expect(quiet.idleYears).toEqual([2020, 2021])
    const ribbons = busRibbons(quiet)
    const idleVertices = [...ribbons.idle.keys()].filter((v) => ribbons.idle[v] === 1)
    // Deux années consécutives d'une même rangée : un seul morceau de 2 points × 8 fils.
    expect(idleVertices.length).toBe(2 * 2 * BUS_WIRES)
    for (const v of idleVertices) expect(ribbons.segmentIndex[v]).toBe(-1)
    const xs = idleVertices.map((v) => ribbons.positions[v * 3]!)
    const at2020 = quiet.milestones.find((m) => m.year === 2020)!.at
    const at2021 = quiet.milestones.find((m) => m.year === 2021)!.at
    expect(Math.min(...xs)).toBeCloseTo(at2020[0] - quiet.step / 2, 6)
    expect(Math.max(...xs)).toBeCloseTo(at2021[0] + quiet.step / 2, 6)
  })

  it('deux années éteintes séparées par un lacet font deux morceaux', () => {
    const t: Timeline = {
      ...real.plan.timeline,
      step: 1,
      idleYears: [2001, 2002],
      milestones: [
        { year: 2001, at: [5, 0] },
        { year: 2002, at: [5, 3] },
      ],
      segments: [],
      jogs: [],
    }
    const ribbons = busRibbons(t)
    expect(ribbons.idle.filter((v) => v === 1).length).toBe(2 * 2 * 2 * BUS_WIRES)
  })

  it('le grand banc : des marches dessinées, toutes les voies, aucun tronçon perdu', () => {
    const t = large.plan.timeline
    expect(t.jogs.length).toBeGreaterThan(0)
    const ribbons = busRibbons(t)
    expect(new Set([...ribbons.segmentIndex].filter((s) => s >= 0)).size).toBe(t.segments.length)
  })
})

describe('withJog', () => {
  const jog = (points: Vec2[]): BusJog => ({ lane: 0, year: 2000, at: points[1]!, points })

  it('insère la marche dans le tronçon qui la porte entière', () => {
    const out = withJog(
      [
        [0, 0],
        [10, 0],
      ],
      jog([
        [4, 0],
        [4.5, -0.45],
        [5, 0],
      ]),
    )
    expect(out).toEqual([
      [0, 0],
      [4, 0],
      [4.5, -0.45],
      [5, 0],
      [10, 0],
    ])
  })

  it('le tronçon qui se termine à la frontière monte jusqu’au sommet', () => {
    const out = withJog(
      [
        [0, 0],
        [4.5, 0],
      ],
      jog([
        [4, 0],
        [4.5, -0.45],
        [5, 0],
      ]),
    )
    expect(out).toEqual([
      [0, 0],
      [4, 0],
      [4.5, -0.45],
    ])
  })

  it('le tronçon qui commence à la frontière part du sommet', () => {
    const out = withJog(
      [
        [4.5, 0],
        [10, 0],
      ],
      jog([
        [4, 0],
        [4.5, -0.45],
        [5, 0],
      ]),
    )
    expect(out).toEqual([
      [4.5, -0.45],
      [5, 0],
      [10, 0],
    ])
  })

  it('une marche ailleurs ne touche pas le tronçon', () => {
    const path: Vec2[] = [
      [0, 2],
      [10, 2],
    ]
    expect(
      withJog(
        path,
        jog([
          [4, 0],
          [4.5, -0.45],
          [5, 0],
        ]),
      ),
    ).toBe(path)
  })
})

describe('routeTones', () => {
  it('une teinte par route : celle de la famille, ou du poste pour une prise au bus', () => {
    const tones = routeTones(real.plan)
    expect(tones.length).toBe(real.plan.traces.routes.length)
    for (const t of tones) expect(TONES).toContain(t)
    real.plan.traces.routes.forEach((r, i) => {
      if (r.kind === 'bus-link') {
        const segment = real.plan.timeline.segments.find(
          (s) => s.experience === r.busLink!.experience,
        )!
        expect(tones[i]).toBe(segment.tone)
      }
      if (r.kind === 'trunk') {
        const zone = real.plan.zones.find((z) => r.net === `zone:${z.family}`)!
        expect(tones[i]).toBe(zone.tone)
      }
    })
  })

  it('une route inconnue retombe sur la première teinte', () => {
    const plan = {
      ...small.plan,
      traces: {
        ...small.plan.traces,
        routes: [
          route(
            [
              [0, 0],
              [1, 0],
            ],
            'ailleurs',
          ),
        ],
      },
    }
    expect(routeTones(plan)).toEqual([TONES[0]])
  })
})

describe('hexToLinear', () => {
  it('convertit sRGB → linéaire (noir, blanc, gris moyen)', () => {
    expect(hexToLinear('#000000')).toEqual([0, 0, 0])
    expect(hexToLinear('#FFFFFF')).toEqual([1, 1, 1])
    expect(hexToLinear('#808080')[0]).toBeCloseTo(0.2158605, 6)
    expect(hexToLinear('#0a0a0a')[0]).toBeCloseTo(10 / 255 / 12.92, 9)
    expect(hexToLinear(PALETTE.cyan).length).toBe(3)
  })
})

describe('instances', () => {
  const full = instances(real.plan, 'full')
  const chips = real.plan.zones.flatMap((z) => z.chips)
  const processors = real.plan.district.processors
  const passives = real.plan.passives.slice(0, BOARD_DENSITY.full.passives)

  it('un nombre par forme égal aux données', () => {
    expect(full.chips.count).toBe(chips.length)
    expect(full.leds.count).toBe(chips.length)
    expect(full.processors.count).toBe(processors.length)
    expect(full.lids.count).toBe(processors.length)
    expect(full.resistors.count).toBe(passives.filter((p) => p.kind === 'resistor').length)
    expect(full.capacitors.count).toBe(passives.filter((p) => p.kind === 'capacitor').length)
    expect(full.terminals.count).toBe(2 * full.resistors.count)
    expect(full.vias.count).toBe(2 * real.plan.traces.vias.length)
    expect(full.holes.count).toBe(4)
    expect(full.milestones.count).toBe(real.plan.timeline.milestones.length)
    expect(full.glows.count).toBe(chips.length + processors.length + full.milestones.count)
    expect(full.chipPins.count).toBeGreaterThanOrEqual(chips.length * 4 * 3)
    expect(full.processorPins.count).toBeGreaterThanOrEqual(processors.length * 4 * 6)
  })

  it('chaque forme : 16 flottants par instance, et une teinte par instance quand elle en porte', () => {
    for (const shape of SHAPES) {
      const set = full[shape]
      expect(set.matrices.length).toBe(set.count * 16)
      if (set.colors !== null) expect(set.colors.length).toBe(set.count * 3)
    }
  })

  it('la matrice pose la puce à sa place, à sa taille, posée sur la carte', () => {
    const chip = chips[0]!
    const m = full.chips.matrices.subarray(0, 16)
    expect(m[0]).toBeCloseTo(chip.size, 6)
    expect(m[5]).toBeCloseTo(chip.height, 6)
    expect(m[10]).toBeCloseTo(chip.size, 6)
    expect([m[12], m[13], m[14], m[15]].map((v) => Math.round(v! * 1e5) / 1e5)).toEqual([
      Math.round(chip.center[0] * 1e5) / 1e5,
      Math.round((chip.height / 2) * 1e5) / 1e5,
      Math.round(chip.center[1] * 1e5) / 1e5,
      1,
    ])
  })

  it('les teintes des puces viennent du `tone` du plan', () => {
    const chip = chips[0]!
    const [r, g, b] = hexToLinear(PALETTE[chip.tone])
    expect([...full.chips.colors!.subarray(0, 3)]).toEqual([r, g, b].map(Math.fround))
  })

  it('un composant tourné l’est d’un quart de tour', () => {
    const plan = {
      ...real.plan,
      passives: [{ kind: 'resistor' as const, ref: 'R1', center: [0, 0] as Vec2, rotated: true }],
    }
    const m = instances(plan, 'full').resistors.matrices
    // Colonne X tournée de 90° autour de Y : elle pointe vers −Z (ou +Z).
    expect(Math.abs(m[0]!)).toBeLessThan(1e-6)
    expect(Math.abs(m[2]!)).toBeGreaterThan(0.1)
  })

  it('lite : aucun petit composant ; reduced : les N premiers de plan.passives', () => {
    const lite = instances(real.plan, 'lite')
    expect(lite.resistors.count + lite.capacitors.count + lite.terminals.count).toBe(0)
    const reduced = instances(real.plan, 'reduced')
    const first = real.plan.passives.slice(0, BOARD_DENSITY.reduced.passives)
    expect(reduced.resistors.count + reduced.capacitors.count).toBe(first.length)
    expect(reduced.resistors.count).toBe(first.filter((p) => p.kind === 'resistor').length)
  })

  it('la composition ne change pas d’un palier à l’autre', () => {
    const lite = instances(real.plan, 'lite')
    for (const shape of ['chips', 'processors', 'lids', 'vias', 'milestones'] as const) {
      expect(lite[shape].count).toBe(full[shape].count)
    }
  })

  it('un via sans route trouvable se pose quand même, le long de X', () => {
    const plan = {
      ...real.plan,
      traces: { ...real.plan.traces, vias: [{ at: [100, 100] as Vec2, net: 'nul', crosses: 'x' }] },
    }
    const m = instances(plan, 'full').vias.matrices
    expect(m[12]! + m[28]!).toBeCloseTo(200, 6)
    expect(m[14]).toBeCloseTo(100, 6)
    expect(m[30]).toBeCloseTo(100, 6)
  })

  it('un via sur une piste verticale s’aligne sur elle', () => {
    const plan = {
      ...real.plan,
      traces: {
        ...real.plan.traces,
        routes: [
          route(
            [
              [0, -1],
              [0, 1],
            ],
            'v',
          ),
        ],
        vias: [{ at: [0, 0] as Vec2, net: 'v', crosses: 'h' }],
      },
    }
    const m = instances(plan, 'full').vias.matrices
    expect(m[12]).toBeCloseTo(0, 6)
    expect(m[28]).toBeCloseTo(0, 6)
    expect(Math.abs(m[14]! - m[30]!)).toBeGreaterThan(0.1)
  })

  it('un jalon d’année éteinte n’a pas de teinte de poste', () => {
    const quiet = buildBoardFile(
      makeBoardContent({
        experiences: [{ slug: 'exp-a', startYear: 2018, endYear: 2019 }],
        projects: [],
      }),
      { locale: 'fr', year: 2021, chipSizing: 'uniform' },
    ).plan
    const set = instances(quiet, 'full').milestones
    const last = set.colors!.subarray((set.count - 1) * 3, set.count * 3)
    const first = set.colors!.subarray(0, 3)
    expect([...last]).not.toEqual([...first])
  })
})

describe('drawCallBudget', () => {
  it(`≤ ${MAX_DRAW_CALLS} sur le banc de taille réelle et sur le grand banc, à tous les paliers`, () => {
    for (const plan of [real.plan, large.plan]) {
      for (const tier of ['full', 'reduced', 'lite'] as const) {
        const budget = drawCallBudget(instances(plan, tier))
        expect(budget).toBeLessThanOrEqual(MAX_DRAW_CALLS)
        expect(budget).toBeGreaterThan(FIXED_MESHES.length)
      }
    }
  })

  it('une seule liste de maillages, celle que buildBoard monte dans cet ordre', () => {
    const full = instances(real.plan, 'full')
    expect(boardMeshes(full)).toEqual([...FIXED_MESHES, ...SHAPES.filter((s) => full[s].count > 0)])
    expect(FIXED_MESHES).toEqual(['plate', 'silkscreen', 'traces', 'bus', 'pulses'])
    expect(drawCallBudget(full)).toBe(boardMeshes(full).length)
    expect(boardMeshes(instances(real.plan, 'lite'))).not.toContain('resistors')
  })

  it('compte les maillages fixes et une forme par InstancedMesh non vide', () => {
    const full = instances(real.plan, 'full')
    const nonEmpty = SHAPES.filter((s) => full[s].count > 0).length
    expect(drawCallBudget(full)).toBe(FIXED_MESHES.length + nonEmpty)
    const lite = instances(real.plan, 'lite')
    expect(drawCallBudget(lite)).toBeLessThan(drawCallBudget(full))
  })
})
