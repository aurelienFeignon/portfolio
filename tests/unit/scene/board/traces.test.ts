import { describe, expect, it } from 'vitest'
import { boardBounds, timelineOriginZ } from '@/scene/state/board/bounds'
import type { BoardContent } from '@/scene/state/board/content'
import { GRID } from '@/scene/state/board/grid'
import { planDistrict } from '@/scene/state/board/processors'
import { type Rect, rectOf, type Vec2 } from '@/scene/state/board/rect'
import { planTimeline, yearPoint } from '@/scene/state/board/timeline'
import {
  type Link,
  listLinks,
  planTraces,
  planTracesWithGrid,
  type Route,
} from '@/scene/state/board/traces'
import { planZones } from '@/scene/state/board/zones'
import {
  makeBoardContent,
  makeBoardExperience,
  makeBoardProject,
  makeBoardSkill,
  makeRealSizeBoard,
  makeSaturatedBoard,
} from '../../../fixtures/builders/board'
import { expectNoCrossing, expectOctilinear } from './geometry-asserts'

const CURRENT_YEAR = 2026
const EPS = 1e-9

/** La chaîne du plan sans `planBoard` (tâche 7) : quartier → zones → frise → pistes. */
function planFrom(content: BoardContent) {
  const district = planDistrict(content.projects)
  const zones = planZones(content.skills, district.bounds, 'uniform')
  const timeline = planTimeline(
    content.experiences,
    CURRENT_YEAR,
    timelineOriginZ(district.bounds, zones),
  )
  const board = boardBounds([district.bounds, ...zones.map((z) => z.bounds), timeline.bounds])
  const { traces, grid } = planTracesWithGrid(content, zones, district, timeline, board)
  const chips = new Map(
    zones.flatMap((z) => z.chips).map((c) => [c.slug, rectOf(c.center, c.size, c.size)]),
  )
  const processors = new Map(
    district.processors.map((p) => [p.slug, rectOf(p.center, p.size, p.size)]),
  )
  return { district, zones, timeline, board, traces, grid, chips, processors }
}

/** Distance de Tchebychev d'un point à un rectangle (0 dedans ou sur le bord). */
const distance = (p: Vec2, r: Rect): number =>
  Math.max(r.minX - p[0], p[0] - r.maxX, r.minZ - p[1], p[1] - r.maxZ, 0)

/** Une extrémité de la route touche le rectangle (à une cellule près : la pastille). */
const touches = (route: Route, r: Rect): boolean =>
  [route.points[0]!, route.points.at(-1)!].some((p) => distance(p, r) <= GRID + EPS)

/** Le point est sur un segment de la polyligne. */
function onPolyline(p: Vec2, points: readonly Vec2[]): boolean {
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1]!, points[i]!]
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    const inBox =
      p[0] >= Math.min(a[0], b[0]) - EPS &&
      p[0] <= Math.max(a[0], b[0]) + EPS &&
      p[1] >= Math.min(a[1], b[1]) - EPS &&
      p[1] <= Math.max(a[1], b[1]) + EPS
    if (Math.abs(cross) < EPS && inBox) return true
  }
  return false
}

/** Deux routes se touchent si une extrémité de l'une est posée sur l'autre. */
const joined = (a: Route, b: Route): boolean =>
  [a.points[0]!, a.points.at(-1)!].some((p) => onPolyline(p, b.points)) ||
  [b.points[0]!, b.points.at(-1)!].some((p) => onPolyline(p, a.points))

const sameLink = (a: Link) => (b: Link) => a.skill === b.skill && a.project === b.project

/**
 * Chaque liaison est portée par des routes **connexes** dont l'une touche sa
 * puce et une autre (ou la même) son processeur — en mode direct, une seule
 * route ; en bus de famille, amorce + tronc + branche.
 */
function expectEveryLinkConnected(plan: ReturnType<typeof planFrom>): void {
  for (const link of plan.traces.links) {
    if (plan.traces.unrouted.some(sameLink(link))) continue
    const carriers = plan.traces.routes.filter((r) => r.links.some(sameLink(link)))
    const label = `${link.skill} → ${link.project}`
    expect(carriers.length, label).toBeGreaterThan(0)
    const chip = plan.chips.get(link.skill)!
    const processor = plan.processors.get(link.project)!
    // Parcours en largeur depuis les routes qui touchent la puce.
    const reached = new Set(carriers.filter((r) => touches(r, chip)))
    expect(reached.size, `${label} : aucune route ne touche la puce`).toBeGreaterThan(0)
    let grew = true
    while (grew) {
      grew = false
      for (const r of carriers) {
        if (reached.has(r)) continue
        if ([...reached].some((q) => joined(q, r))) {
          reached.add(r)
          grew = true
        }
      }
    }
    expect(
      [...reached].some((r) => touches(r, processor)),
      `${label} : la chaîne n'atteint pas le processeur`,
    ).toBe(true)
  }
}

/**
 * Aucun segment ne passe par l'intérieur d'un boîtier qui n'est pas le sien
 * (échantillonné au quart de cellule). Le sien est celui qu'une extrémité de
 * la route touche : l'atterrissage peut y mordre d'un quart de pas.
 */
function expectAvoids(routes: readonly Route[], rects: readonly Rect[]): void {
  const inside = (p: Vec2, r: Rect) =>
    p[0] > r.minX + EPS && p[0] < r.maxX - EPS && p[1] > r.minZ + EPS && p[1] < r.maxZ - EPS
  for (const route of routes) {
    const foreign = rects.filter((r) => !touches(route, r))
    for (let i = 1; i < route.points.length; i += 1) {
      const [a, b] = [route.points[i - 1]!, route.points[i]!]
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (GRID / 4))
      for (let k = 0; k <= n; k += 1) {
        const p: Vec2 = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]
        const hit = foreign.find((r) => inside(p, r))
        expect(hit, `${route.net} traverse un boîtier en ${p[0]}, ${p[1]}`).toBeUndefined()
      }
    }
  }
}

function expectWellFormed(plan: ReturnType<typeof planFrom>): void {
  for (const route of plan.traces.routes) expectOctilinear(route.points)
  expectNoCrossing(
    plan.traces.routes.map((r) => r.points),
    (i) => plan.traces.routes[i]!.net,
  )
  expectAvoids(plan.traces.routes, [...plan.chips.values(), ...plan.processors.values()])
}

describe('listLinks', () => {
  it('une liaison par couple compétence–projet, technologies inconnues et doublons écartés', () => {
    const content = makeBoardContent({
      projects: [
        makeBoardProject({
          slug: 'p',
          primary: true,
          technologies: ['skill-1', 'skill-1', 'inconnue'],
        }),
      ],
    })
    expect(listLinks(content).filter((l) => l.project === 'p')).toEqual([
      { skill: 'skill-1', project: 'p' },
    ])
  })

  it('le principal d’abord, puis les projets par slug, les compétences par slug', () => {
    const content = makeBoardContent({
      projects: [
        makeBoardProject({ slug: 'p-b', technologies: ['skill-4', 'skill-2'] }),
        makeBoardProject({ slug: 'p-z', primary: true, technologies: ['skill-3', 'skill-1'] }),
        makeBoardProject({ slug: 'p-a', technologies: ['skill-6'] }),
      ],
    })
    expect(listLinks(content)).toEqual([
      { skill: 'skill-1', project: 'p-z' },
      { skill: 'skill-3', project: 'p-z' },
      { skill: 'skill-6', project: 'p-a' },
      { skill: 'skill-2', project: 'p-b' },
      { skill: 'skill-4', project: 'p-b' },
    ])
  })

  it('deux projets de même slug (gate non joué) : pas d’exception, liaisons conservées', () => {
    const content = makeBoardContent({
      projects: [
        makeBoardProject({ slug: 'p', technologies: ['skill-2'] }),
        makeBoardProject({ slug: 'p', technologies: ['skill-1'] }),
        makeBoardProject({ slug: 'q', primary: true }),
      ],
    })
    expect(listLinks(content)).toEqual([
      { skill: 'skill-2', project: 'p' },
      { skill: 'skill-1', project: 'p' },
    ])
  })

  it('aucun projet : aucune liaison', () => {
    expect(listLinks(makeBoardContent({ projects: [] }))).toEqual([])
  })
})

describe('planTraces — rattachements au bus', () => {
  it('rattache au bus le projet né chez un employeur, à son année bornée au poste', () => {
    const content = makeBoardContent({
      projects: [
        makeBoardProject({
          slug: 'p-main',
          primary: true,
          startedAt: '2022-03',
          experience: 'exp-a',
        }),
        makeBoardProject({ slug: 'p-early', startedAt: '2019-01', experience: 'exp-b' }),
        makeBoardProject({ slug: 'p-late', startedAt: '2030', experience: 'exp-b' }),
      ],
    })
    const plan = planFrom(content)
    expect(plan.traces.busLinks).toEqual([
      { project: 'p-main', experience: 'exp-a', year: 2022 },
      { project: 'p-early', experience: 'exp-b', year: 2024 },
      { project: 'p-late', experience: 'exp-b', year: 2025 },
    ])
    for (const bus of plan.traces.busLinks) {
      const route = plan.traces.routes.find(
        (r) =>
          r.kind === 'bus-link' &&
          r.net === `experience:${bus.experience}` &&
          touches(r, plan.processors.get(bus.project)!),
      )
      expect(route, bus.project).toBeDefined()
      expect(route!.links).toEqual([])
      // L'autre extrémité est sur la voie du tronçon, dans la case de l'année.
      const segment = plan.timeline.segments.find((s) => s.experience === bus.experience)!
      const target = yearPoint(plan.timeline, bus.year, segment.lane)
      const end = route!.points.at(-1)!
      expect(Math.abs(end[0] - target[0])).toBeLessThan(plan.timeline.step / 2)
      expect(Math.abs(end[1] - target[1])).toBeLessThanOrEqual(GRID)
    }
    expectWellFormed(plan)
  })

  it('ignore un rattachement vers une expérience absente, sans exception', () => {
    const content = makeBoardContent({
      projects: [makeBoardProject({ slug: 'p', primary: true, experience: 'exp-absente' })],
    })
    const plan = planFrom(content)
    expect(plan.traces.busLinks).toEqual([])
    expect(plan.traces.routes.filter((r) => r.kind === 'bus-link')).toEqual([])
  })

  it('perce la voie 1 au travers de la voie 0 pour un poste simultané', () => {
    const plan = planFrom(makeRealSizeBoard())
    const lane1 = plan.traces.busLinks.find((b) => b.experience === 'exp-b')!
    expect(lane1).toEqual({ project: 'proj-main', experience: 'exp-b', year: 2025 })
    expect(plan.traces.routes.filter((r) => r.kind === 'bus-link')).toHaveLength(2)
  })
  it('lacet : la prise d’une année de la rangée 1 glisse hors du puits d’une prise de la rangée 0', () => {
    // 17 années, 3 rangées : 2010 (rangée 0, case 0) et 2025 (rangée 1, case 7)
    // tombent à la même abscisse, et le puits de 2025 traverse la rangée 0.
    const content = makeBoardContent({
      experiences: [
        makeBoardExperience({ slug: 'exp-a', startYear: 2010, endYear: 2013 }),
        makeBoardExperience({ slug: 'exp-b', startYear: 2014 }),
      ],
      projects: [
        makeBoardProject({ slug: 'p-1', primary: true, startedAt: '2010', experience: 'exp-a' }),
        makeBoardProject({ slug: 'p-2', startedAt: '2025', experience: 'exp-b' }),
      ],
    })
    const plan = planFrom(content)
    expect(yearPoint(plan.timeline, 2010, 0)[0]).toBeCloseTo(yearPoint(plan.timeline, 2025, 0)[0])
    const busRoutes = plan.traces.routes.filter((r) => r.kind === 'bus-link')
    expect(busRoutes.map((r) => r.net)).toEqual(['experience:exp-a', 'experience:exp-b'])
    const end = busRoutes[1]!.points.at(-1)!
    const target = yearPoint(plan.timeline, 2025, 0)
    expect(end[0]).not.toBeCloseTo(target[0])
    expect(Math.abs(end[0] - target[0])).toBeLessThan(plan.timeline.step / 2)
    expect(Math.abs(end[1] - target[1])).toBeLessThanOrEqual(GRID)
    expectWellFormed(plan)
  })
})

describe('planTraces — liaisons', () => {
  it('une compétence qu’aucun projet n’utilise reste sans piste', () => {
    const plan = planFrom(makeBoardContent())
    for (const unused of ['skill-4', 'skill-6']) {
      expect(plan.traces.routes.some((r) => r.links.some((l) => l.skill === unused))).toBe(false)
      expect(plan.traces.routes.some((r) => touches(r, plan.chips.get(unused)!))).toBe(false)
    }
  })

  it('le petit contenu se route en direct, une route par liaison', () => {
    const plan = planFrom(makeBoardContent())
    expect(plan.traces.mode).toBe('direct')
    expect(plan.traces.unrouted).toEqual([])
    const linkRoutes = plan.traces.routes.filter((r) => r.kind === 'link')
    const key = (l: Link) => `${l.skill}>${l.project}`
    for (const r of linkRoutes) expect(r.links).toHaveLength(1)
    expect(linkRoutes.map((r) => key(r.links[0]!)).sort()).toEqual(
      plan.traces.links.map(key).sort(),
    )
    for (const r of linkRoutes) expect(r.net).toBe(`chip:${r.links[0]!.skill}`)
    expectEveryLinkConnected(plan)
    expectWellFormed(plan)
  })

  it('route TOUTES les liaisons du contenu réel, sans croisement entre réseaux', () => {
    const plan = planFrom(makeRealSizeBoard())
    expect(plan.traces.links).toHaveLength(31 + 10 + 7)
    expect(plan.traces.unrouted).toEqual([])
    expectWellFormed(plan)
  })

  it('chaque liaison est portée par au moins une route, qui touche sa puce et son processeur', () => {
    expectEveryLinkConnected(planFrom(makeRealSizeBoard()))
    expectEveryLinkConnected(planFrom(makeBoardContent()))
  })

  it('aucune piste ne traverse une puce ou un processeur qui n’est pas le sien', () => {
    const plan = planFrom(makeRealSizeBoard())
    expectAvoids(plan.traces.routes, [...plan.chips.values(), ...plan.processors.values()])
  })

  it('la grille rendue est dans l’état final : chaque piste y occupe ses cellules', () => {
    for (const content of [makeRealSizeBoard(), makeSaturatedBoard()]) {
      const plan = planFrom(content)
      for (const route of plan.traces.routes) {
        // Les sommets posés au centre d'une cellule (les atterrissages tombent sur un bord).
        const centers = route.points.filter((p) => {
          const c = plan.grid.toPoint(plan.grid.cellOf(p))
          return Math.abs(c[0] - p[0]) < EPS && Math.abs(c[1] - p[1]) < EPS
        })
        expect(centers.length, route.net).toBeGreaterThan(0)
        for (const p of centers)
          expect(plan.grid.occupant(plan.grid.cellOf(p)), route.net).toBe(route.net)
      }
    }
  })
})

describe('planTraces — bus de famille', () => {
  it('bascule en bus de famille quand les canaux ne tiennent plus', () => {
    const plan = planFrom(makeSaturatedBoard())
    expect(plan.traces.mode).toBe('family-bus')
    expect(plan.traces.unrouted).toEqual([])
    const trunks = plan.traces.routes.filter((r) => r.kind === 'trunk')
    expect(trunks).toHaveLength(1)
    expect(trunks[0]!.net).toBe('zone:tooling')
    expect(trunks[0]!.links).toHaveLength(200)
    // Le tronc part de la sortie de la zone et finit au bord du quartier.
    const zone = plan.zones[0]!
    expect(distance(trunks[0]!.points[0]!, rectOf(zone.exit, 0, 0))).toBeLessThanOrEqual(GRID)
    expect(distance(trunks[0]!.points.at(-1)!, plan.district.bounds)).toBeLessThanOrEqual(GRID)
    for (const r of plan.traces.routes) expect(r.net).toBe('zone:tooling')
    expectEveryLinkConnected(plan)
    for (const route of plan.traces.routes) expectOctilinear(route.points)
    expectAvoids(plan.traces.routes, [...plan.chips.values(), ...plan.processors.values()])
  })
})

describe('planTraces — replis', () => {
  it('contenu creux : aucune liaison, aucune piste, mode direct', () => {
    const plan = planFrom({ skills: [], experiences: [], projects: [] })
    expect(plan.traces).toEqual({
      mode: 'direct',
      links: [],
      busLinks: [],
      routes: [],
      unrouted: [],
    })
  })

  it('une puce ou un processeur absent du plan : la liaison va dans unrouted, sans exception', () => {
    const content = makeBoardContent()
    const plan = planFrom(content)
    // Zones et quartier calculés sans skill-1 ni proj-b.
    const zones = plan.zones.map((z) => ({
      ...z,
      chips: z.chips.filter((c) => c.slug !== 'skill-1'),
    }))
    const district = {
      ...plan.district,
      processors: plan.district.processors.filter((p) => p.slug !== 'proj-b'),
    }
    const traces = planTraces(content, zones, district, plan.timeline, plan.board)
    expect(traces.mode).toBe('direct')
    expect(traces.unrouted).toEqual([
      { skill: 'skill-1', project: 'proj-a' },
      { skill: 'skill-2', project: 'proj-b' },
      { skill: 'skill-5', project: 'proj-b' },
    ])
    expect(traces.busLinks.map((b) => b.project)).toEqual(['proj-a'])
  })

  it('une carte trop étroite : rien ne se route, tout va dans unrouted, sans exception', () => {
    const content = makeBoardContent()
    const plan = planFrom(content)
    // La grille ne couvre que le quartier : ni les puces, ni le bus, ni l'anneau du quartier.
    const traces = planTraces(
      content,
      plan.zones,
      plan.district,
      plan.timeline,
      plan.district.bounds,
    )
    expect(traces.mode).toBe('family-bus')
    expect(traces.routes).toEqual([])
    expect(traces.unrouted).toEqual(traces.links)
    expect(traces.busLinks).toHaveLength(2)
  })

  it('une prise hors de la carte glisse vers l’intérieur de sa case', () => {
    const content = makeBoardContent()
    const plan = planFrom(content)
    const target = yearPoint(plan.timeline, 2022, 0)
    // La carte s'arrête une demi-cellule à droite de la prise de proj-a (2022, voie 0).
    const board = { ...plan.board, minX: target[0] + GRID / 2 }
    const traces = planTraces(content, plan.zones, plan.district, plan.timeline, board)
    const route = traces.routes.find((r) => r.net === 'experience:exp-a')!
    const end = route.points.at(-1)!
    expect(end[0]).toBeGreaterThan(board.minX)
    expect(end[0] - target[0]).toBeLessThan(plan.timeline.step / 2)
  })

  it('deux puces au même angle autour du processeur : routées par slug', () => {
    const content = makeBoardContent({
      skills: [makeBoardSkill({ slug: 'b-near' }), makeBoardSkill({ slug: 'a-far' })],
      experiences: [],
      projects: [makeBoardProject({ slug: 'p', primary: true, technologies: ['b-near', 'a-far'] })],
    })
    const district = planDistrict(content.projects)
    const chip = (slug: string, z: number) => ({
      slug,
      family: 'language' as const,
      ref: slug,
      center: [0, z] as const,
      size: 0.9,
      height: 0.2,
      tone: 'cyan' as const,
    })
    // Les deux puces à l'aplomb du processeur (x = 0) : même angle.
    const zone = {
      family: 'language' as const,
      tone: 'cyan' as const,
      bounds: { minX: -1, minZ: -9, maxX: 1, maxZ: -4 },
      chips: [chip('b-near', -5), chip('a-far', -8)],
      exit: [0, -4] as const,
      labelAnchor: [0, -9.3] as const,
    }
    const timeline = planTimeline([], CURRENT_YEAR, 5)
    const board = boardBounds([district.bounds, zone.bounds, timeline.bounds])
    const traces = planTraces(content, [zone], district, timeline, board)
    expect(traces.mode).toBe('direct')
    expect(traces.routes.map((r) => r.net)).toEqual(['chip:a-far', 'chip:b-near'])
  })

  it('un processeur emmuré : ses liaisons et son rattachement manquent, les autres passent', () => {
    const content = makeBoardContent()
    const plan = planFrom(content)
    const walled = plan.district.processors.find((p) => p.slug === 'proj-b')!
    // Un boîtier factice, plus grand, recouvre l'anneau de proj-b.
    const district = {
      ...plan.district,
      processors: [
        ...plan.district.processors,
        { ...walled, slug: 'mur', primary: false, size: walled.size + 1 },
      ],
    }
    const traces = planTraces(content, plan.zones, district, plan.timeline, plan.board)
    expect(traces.mode).toBe('family-bus')
    expect(traces.unrouted).toEqual([
      { skill: 'skill-2', project: 'proj-b' },
      { skill: 'skill-5', project: 'proj-b' },
    ])
    expect(traces.routes.filter((r) => r.kind === 'bus-link').map((r) => r.net)).toEqual([
      'experience:exp-a',
    ])
    // Aucune piste ne porte une liaison perdue (pas d'amorce orpheline vers proj-b).
    for (const r of traces.routes) expect(r.links.every((l) => l.project !== 'proj-b')).toBe(true)
    expect(traces.routes.some((r) => r.kind === 'trunk')).toBe(true)
  })

  it('même contenu dans un autre ordre : mêmes pistes', () => {
    const content = makeRealSizeBoard()
    const permuted: BoardContent = {
      skills: [...content.skills].reverse(),
      experiences: [...content.experiences].reverse(),
      projects: [...content.projects].reverse().map((p) => ({
        ...p,
        technologies: [...p.technologies].reverse(),
      })),
    }
    const a = planFrom(content)
    const b = planFrom(permuted)
    expect(b.traces).toEqual(a.traces)
  })

  it('planTraces rend les pistes de planTracesWithGrid', () => {
    const plan = planFrom(makeBoardContent())
    expect(
      planTraces(makeBoardContent(), plan.zones, plan.district, plan.timeline, plan.board),
    ).toEqual(plan.traces)
  })

  it('le plus petit contenu : une piste et un rattachement', () => {
    const content = makeBoardContent({
      skills: [makeBoardSkill({ slug: 's' })],
      experiences: [makeBoardExperience({ slug: 'e', startYear: 2020 })],
      projects: [
        makeBoardProject({ slug: 'p', primary: true, technologies: ['s'], experience: 'e' }),
      ],
    })
    const plan = planFrom(content)
    expect(plan.traces.mode).toBe('direct')
    expect(plan.traces.routes.map((r) => r.kind).sort()).toEqual(['bus-link', 'link'])
  })
})
