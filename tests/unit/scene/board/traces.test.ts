import { describe, expect, it } from 'vitest'
import { boardBounds, timelineOriginZ } from '@/scene/state/board/bounds'
import type { BoardContent } from '@/scene/state/board/content'
import { GRID } from '@/scene/state/board/grid'
import { planDistrict } from '@/scene/state/board/processors'
import { EPSILON as EPS, type Rect, rectOf, type Vec2 } from '@/scene/state/board/rect'
import { LANE_PITCH, planTimeline, yearPoint } from '@/scene/state/board/timeline'
import {
  type Link,
  listLinks,
  planTraces,
  planTracesWithGrid,
  type Route,
  underJog,
} from '@/scene/state/board/traces'
import { planZones } from '@/scene/state/board/zones'
import {
  makeBoardContent,
  makeBoardExperience,
  makeBoardProject,
  makeBoardSkill,
  makeLargeBoard,
  makeRealSizeBoard,
  makeSaturatedBoard,
} from '../../../fixtures/builders/board'
import {
  expectNoCrossing,
  expectNoReversal,
  expectOctilinear,
  onPolyline,
  rectContains,
} from './geometry-asserts'

const CURRENT_YEAR = 2026
/** Capacité mesurée du mode direct : puces d'une famille vers un seul processeur. */
const DIRECT_FAN = 9

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

/** Le point est sur le **bord** du rectangle, à ε près. */
const onEdge = (p: Vec2, r: Rect): boolean =>
  distance(p, r) < EPS &&
  Math.min(
    Math.abs(p[0] - r.minX),
    Math.abs(p[0] - r.maxX),
    Math.abs(p[1] - r.minZ),
    Math.abs(p[1] - r.maxZ),
  ) < EPS

/** Une extrémité de la route est posée sur le bord du rectangle. */
const touches = (route: Route, r: Rect): boolean =>
  [route.points[0]!, route.points.at(-1)!].some((p) => onEdge(p, r))

/** Le segment est horizontal ou vertical (une pastille ne part jamais en biais). */
const orthogonal = (a: Vec2, b: Vec2): boolean =>
  Math.abs(a[0] - b[0]) < EPS || Math.abs(a[1] - b[1]) < EPS

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

/** Aucun segment ne passe par l'intérieur d'un boîtier (échantillonné au quart de cellule). */
function expectAvoids(routes: readonly Route[], rects: readonly Rect[]): void {
  // Intérieur strict, rétréci de `EPS` : longer un bord n'est pas le traverser.
  const inside = (p: Vec2, r: Rect) => rectContains(r, p, { margin: -EPS, strict: true })
  for (const route of routes) {
    for (let i = 1; i < route.points.length; i += 1) {
      const [a, b] = [route.points[i - 1]!, route.points[i]!]
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (GRID / 4))
      for (let k = 0; k <= n; k += 1) {
        const p: Vec2 = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]
        const hit = rects.find((r) => inside(p, r))
        expect(hit, `${route.net} traverse un boîtier en ${p[0]}, ${p[1]}`).toBeUndefined()
      }
    }
  }
}

/**
 * Les extrémités : chaque pastille de puce ou de processeur finit **sur le
 * bord réel** de sa boîte, à ε près, par un segment orthogonal ; une liaison
 * au bus part de son processeur et finit **sur la ligne de sa voie**.
 */
function expectExactEnds(plan: ReturnType<typeof planFrom>): void {
  for (const route of plan.traces.routes) {
    const [first, second] = [route.points[0]!, route.points[1]!]
    const [last, before] = [route.points.at(-1)!, route.points.at(-2)!]
    const chipEnd = () => {
      const skills = new Set(route.links.map((l) => l.skill))
      return skills.size === 1 && onEdge(first, plan.chips.get([...skills][0]!)!)
    }
    const processorEnd = () => {
      const projects = new Set(route.links.map((l) => l.project))
      return projects.size === 1 && onEdge(last, plan.processors.get([...projects][0]!)!)
    }
    if (route.kind === 'bus-link') {
      expect(onEdge(first, plan.processors.get(route.busLink!.project)!), route.net).toBe(true)
      expect(orthogonal(first, second), route.net).toBe(true)
      const segment = plan.timeline.segments.find(
        (s) => s.experience === route.busLink!.experience,
      )!
      // La prise est dans la case de l'année (§5, « à l'année de son début »),
      // quelle que soit la voie : le décalage par voie ne l'en fait pas sortir.
      const target = yearPoint(plan.timeline, route.busLink!.year, segment.lane)
      expect(Math.abs(last[0] - target[0]), route.net).toBeLessThan(plan.timeline.step / 2)
      expect(last[1]).toBeCloseTo(target[1], 9)
    } else if (route.kind === 'link' && plan.traces.mode === 'direct') {
      expect(chipEnd() && processorEnd(), route.net).toBe(true)
      expect(orthogonal(first, second) && orthogonal(last, before), route.net).toBe(true)
    } else if (route.kind === 'link') {
      // Bus de famille : une amorce part de sa puce, une branche finit sur son processeur.
      const stub = chipEnd()
      expect(stub || processorEnd(), route.net).toBe(true)
      expect(stub ? orthogonal(first, second) : orthogonal(last, before), route.net).toBe(true)
    }
  }
}

function expectWellFormed(plan: ReturnType<typeof planFrom>): void {
  for (const route of plan.traces.routes) {
    expectOctilinear(route.points)
    expectNoReversal(route.points)
  }
  expectNoCrossing(
    plan.traces.routes.map((r) => r.points),
    (i) => plan.traces.routes[i]!.net,
    { strict: true, vias: plan.traces.vias },
  )
  expectAvoids(plan.traces.routes, [...plan.chips.values(), ...plan.processors.values()])
  expectExactEnds(plan)
  // Un pont est posé là où son réseau franchit réellement l'autre.
  for (const via of plan.traces.vias) {
    const on = (net: string) =>
      plan.traces.routes.some((r) => r.net === net && onPolyline(via.at, r.points))
    expect(on(via.net) && on(via.crosses), `pont ${via.net} × ${via.crosses}`).toBe(true)
  }
}

/** Rien de perdu : toutes les liaisons et tous les rattachements sont routés. */
function expectComplete(plan: ReturnType<typeof planFrom>): void {
  expect(plan.traces.unrouted).toEqual([])
  expect(plan.traces.unroutedBusLinks).toEqual([])
  expect(plan.traces.routes.filter((r) => r.kind === 'bus-link')).toHaveLength(
    plan.traces.busLinks.length,
  )
  expectEveryLinkConnected(plan)
  expectWellFormed(plan)
}

/** Le contenu réel, plus un projet de 3 technologies sur 3 familles, rattaché. */
function realPlusOne(): BoardContent {
  const real = makeRealSizeBoard()
  return {
    ...real,
    projects: [
      ...real.projects,
      makeBoardProject({
        slug: 'proj-d',
        startedAt: '2024-03',
        technologies: ['language-01', 'framework-05', 'practice-07'],
        experience: 'exp-a',
      }),
    ],
  }
}

/** K3,3 : trois familles d'une compétence chacune, et trois projets qui les citent toutes. */
function k33(): BoardContent {
  const skills = [
    makeBoardSkill({ slug: 'k-lang', family: 'language' }),
    makeBoardSkill({ slug: 'k-frame', family: 'framework' }),
    makeBoardSkill({ slug: 'k-tool', family: 'tooling' }),
  ]
  const technologies = skills.map((s) => s.slug)
  return {
    skills,
    experiences: [],
    projects: ['k-p1', 'k-p2', 'k-p3'].map((slug, i) =>
      makeBoardProject({ slug, startedAt: `202${i}`, primary: i === 0, technologies }),
    ),
  }
}

/** Un seul projet qui cite `n` compétences d'une même famille. */
function fan(n: number): BoardContent {
  const skills = Array.from({ length: n }, (_, i) =>
    makeBoardSkill({ slug: `fan-${String(i + 1).padStart(2, '0')}`, family: 'framework' }),
  )
  return {
    skills,
    experiences: [],
    projects: [
      makeBoardProject({ slug: 'p', primary: true, technologies: skills.map((s) => s.slug) }),
    ],
  }
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
      // La route porte son rattachement : le survol retrouve le projet.
      expect(route!.busLink).toEqual(bus)
      // L'autre extrémité est sur la voie du tronçon, dans la case de l'année.
      const segment = plan.timeline.segments.find((s) => s.experience === bus.experience)!
      const target = yearPoint(plan.timeline, bus.year, segment.lane)
      const end = route!.points.at(-1)!
      expect(Math.abs(end[0] - target[0])).toBeLessThan(plan.timeline.step / 2)
      expect(end[1]).toBeCloseTo(target[1], 9)
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

  it('perce la voie 1 au travers de la voie 0 pour un poste simultané', { timeout: 30_000 }, () => {
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
    expect(busRoutes.map((r) => r.net).sort()).toEqual(['experience:exp-a', 'experience:exp-b'])
    const end = busRoutes.find((r) => r.net === 'experience:exp-b')!.points.at(-1)!
    const target = yearPoint(plan.timeline, 2025, 0)
    expect(end[0]).not.toBeCloseTo(target[0])
    expect(Math.abs(end[0] - target[0])).toBeLessThan(plan.timeline.step / 2)
    expect(end[1]).toBeCloseTo(target[1], 9)
    expectWellFormed(plan)
  })
  it('six postes simultanés sur 11 années : la prise de la voie 5 reste dans sa case', () => {
    // 11 années, pas de 2,5 : la case n'a que ±4 colonnes, et la voie 5 décalée
    // de 5 × TAP_STRIDE cellules sortait de la case — aucune colonne candidate, rattachement perdu.
    const experiences = Array.from({ length: 6 }, (_, i) =>
      makeBoardExperience({ slug: `exp-${i}`, startYear: 2016 + i, endYear: null }),
    )
    const content: BoardContent = {
      skills: [],
      experiences,
      projects: [
        makeBoardProject({ slug: 'p', primary: true, startedAt: '2023', experience: 'exp-5' }),
      ],
    }
    const plan = planFrom(content)
    expect(plan.timeline.step).toBeCloseTo(2.5)
    const lane = plan.timeline.segments.find((s) => s.experience === 'exp-5')!.lane
    expect(lane).toBe(5)
    expect(plan.traces.unroutedBusLinks).toEqual([])
    expectComplete(plan)
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

  it('le petit contenu sans rattachement se route en direct, une route par liaison', () => {
    const plan = planFrom(makeBoardContent({ experiences: [] }))
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

  it(
    'route TOUTES les liaisons du contenu réel, sans croisement entre réseaux',
    { timeout: 30_000 },
    () => {
      const plan = planFrom(makeRealSizeBoard())
      expect(plan.traces.links).toHaveLength(31 + 10 + 7)
      expect(plan.traces.unrouted).toEqual([])
      expectWellFormed(plan)
    },
  )

  it(
    'chaque liaison est portée par au moins une route, qui touche sa puce et son processeur',
    { timeout: 30_000 },
    () => {
      expectEveryLinkConnected(planFrom(makeRealSizeBoard()))
      expectEveryLinkConnected(planFrom(makeBoardContent()))
    },
  )

  it(
    'aucune piste ne traverse une puce ou un processeur qui n’est pas le sien',
    { timeout: 30_000 },
    () => {
      const plan = planFrom(makeRealSizeBoard())
      expectAvoids(plan.traces.routes, [...plan.chips.values(), ...plan.processors.values()])
    },
  )

  it(
    'la grille rendue est dans l’état final : chaque piste y occupe ses cellules',
    { timeout: 30_000 },
    () => {
      for (const content of [makeRealSizeBoard(), makeSaturatedBoard()]) {
        const plan = planFrom(content)
        for (const route of plan.traces.routes) {
          // Les sommets posés au centre d'une cellule (les atterrissages tombent sur un
          // bord) ; et la fin d'un rattachement, sur la ligne de la voie, dans la
          // dernière cellule du puits — un rattachement tout droit n'a aucun autre sommet.
          const centers = route.points.filter((p) => {
            const c = plan.grid.toPoint(plan.grid.cellOf(p))
            return Math.abs(c[0] - p[0]) < EPS && Math.abs(c[1] - p[1]) < EPS
          })
          if (route.kind === 'bus-link') centers.push(route.points.at(-1)!)
          expect(centers.length, route.net).toBeGreaterThan(0)
          for (const p of centers)
            expect(plan.grid.occupant(plan.grid.cellOf(p)), route.net).toBe(route.net)
        }
      }
    },
  )
})

describe('planTraces — acceptation : rien de perdu', () => {
  it('contenu réel : toutes les liaisons et tous les rattachements', { timeout: 30_000 }, () => {
    expectComplete(planFrom(makeRealSizeBoard()))
  })

  it('contenu réel + un projet sur trois familles, rattaché', { timeout: 30_000 }, () => {
    const plan = planFrom(realPlusOne())
    expect(plan.traces.links).toHaveLength(48 + 3)
    expect(plan.traces.busLinks).toHaveLength(3)
    expectComplete(plan)
  })

  // ≈ 1 s seul (planification ≈ 0,8 s) ; sous l'instrumentation de couverture,
  // en parallèle des autres fichiers, il a dépassé les 5 s par défaut.
  it('grand contenu (20 projets, 20 années, 80 compétences)', { timeout: 30_000 }, () => {
    const plan = planFrom(makeLargeBoard())
    expect(plan.traces.busLinks).toHaveLength(20)
    expectComplete(plan)
  })

  it('K3,3 : ne se route que grâce à au moins un pont', () => {
    const plan = planFrom(k33())
    expect(plan.traces.mode).toBe('family-bus')
    expect(plan.traces.vias.length).toBeGreaterThanOrEqual(1)
    expectComplete(plan)
  })
})

describe('planTraces — capacité du mode direct', () => {
  it('direct seulement sans pont : le petit contenu sans rattachement y tient', () => {
    const plan = planFrom(makeBoardContent({ experiences: [] }))
    expect(plan.traces.mode).toBe('direct')
    expect(plan.traces.vias).toEqual([])
    expectComplete(plan)
  })

  it('deux rattachements croisés (processeurs et années en ordre inverse) : bus de famille', () => {
    // proj-a (centre) se branche en 2022, à gauche ; proj-b (ouest) en 2024, à droite :
    // sans pont, l'un des deux doit ceinturer un processeur — le mode direct est refusé.
    const plan = planFrom(makeBoardContent())
    expect(plan.traces.mode).toBe('family-bus')
    expectComplete(plan)
  })

  it(
    `un processeur tient ${DIRECT_FAN} puces d’une famille en direct ; une de plus bascule`,
    { timeout: 30_000 },
    () => {
      const fits = planFrom(fan(DIRECT_FAN))
      expect(fits.traces.mode).toBe('direct')
      expect(fits.traces.vias).toEqual([])
      expectComplete(fits)
      const over = planFrom(fan(DIRECT_FAN + 1))
      expect(over.traces.mode).toBe('family-bus')
      expectComplete(over)
    },
  )
})

describe('planTraces — bus de famille', () => {
  it('bascule en bus de famille quand les canaux ne tiennent plus', { timeout: 30_000 }, () => {
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
    // Le tronc s'arrête sur l'anneau qui borde le quartier (sans y atterrir).
    expect(distance(trunks[0]!.points.at(-1)!, plan.district.bounds)).toBeLessThanOrEqual(
      1.5 * GRID,
    )
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
      vias: [],
      unrouted: [],
      unroutedBusLinks: [],
    })
  })

  it(
    'une puce ou un processeur absent du plan : la liaison va dans unrouted, sans exception',
    { timeout: 30_000 },
    () => {
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
    },
  )

  it(
    'une carte trop étroite : rien ne se route, tout va dans unrouted, sans exception',
    { timeout: 30_000 },
    () => {
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
      expect(traces.unroutedBusLinks).toEqual(traces.busLinks)
    },
  )

  it('une prise hors de la carte glisse vers l’intérieur de sa case', { timeout: 30_000 }, () => {
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

  it(
    'un processeur emmuré : ses liaisons et son rattachement manquent, les autres passent',
    { timeout: 30_000 },
    () => {
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
      expect(traces.unroutedBusLinks).toEqual([
        { project: 'proj-b', experience: 'exp-b', year: 2024 },
      ])
      // Aucune piste ne porte une liaison perdue (pas d'amorce orpheline vers proj-b).
      for (const r of traces.routes) expect(r.links.every((l) => l.project !== 'proj-b')).toBe(true)
      expect(traces.routes.some((r) => r.kind === 'trunk')).toBe(true)
    },
  )

  it('même contenu dans un autre ordre : mêmes pistes', { timeout: 30_000 }, () => {
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

  it('planTraces rend les pistes de planTracesWithGrid', { timeout: 30_000 }, () => {
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

describe('planTraces — marches du bus et prises', () => {
  /** Aucune marche (`timeline.jogs`) ne croise une piste, prises du bus comprises. */
  function expectJogsClear(plan: ReturnType<typeof planFrom>): void {
    const jogs = plan.timeline.jogs.map((j) => j.points)
    const routes = plan.traces.routes.map((r) => r.points)
    expectNoCrossing([...jogs, ...routes], (i) => (i < jogs.length ? 'jog' : 'route'))
  }

  /** Une prise tombe dans l'année d'un changement d'employeur, à plusieurs voies de distance. */
  function employerChange(): BoardContent {
    return makeBoardContent({
      experiences: [
        makeBoardExperience({ slug: 'exp-a', startYear: 2018, endYear: 2020 }),
        makeBoardExperience({ slug: 'exp-c', startYear: 2019, endYear: 2024 }),
        makeBoardExperience({ slug: 'exp-b', startYear: 2021, endYear: null }),
      ],
      projects: [
        makeBoardProject({
          slug: 'proj-a',
          startedAt: '2020-03',
          technologies: ['skill-1'],
          experience: 'exp-a',
        }),
        makeBoardProject({
          slug: 'proj-b',
          startedAt: '2021-03',
          technologies: ['skill-3'],
          experience: 'exp-b',
        }),
        makeBoardProject({
          slug: 'proj-c',
          startedAt: '2021-09',
          technologies: ['skill-5'],
          experience: 'exp-c',
        }),
      ],
    })
  }

  it(
    'le contenu réel et le contenu réel + 1 : aucune marche ne croise une piste',
    {
      timeout: 30_000,
    },
    () => {
      expectJogsClear(planFrom(makeRealSizeBoard()))
      expectJogsClear(planFrom(realPlusOne()))
    },
  )

  it('grand contenu : aucune marche ne croise une piste', { timeout: 30_000 }, () => {
    const plan = planFrom(makeLargeBoard())
    expect(plan.timeline.jogs.length).toBeGreaterThan(0)
    expectJogsClear(plan)
  })

  it(
    'une prise dans l’année d’un changement d’employeur évite la marche',
    {
      timeout: 30_000,
    },
    () => {
      const plan = planFrom(employerChange())
      expect(plan.timeline.jogs.length).toBeGreaterThan(0)
      expectComplete(plan)
      expectJogsClear(plan)
    },
  )
})

describe('underJog — quelles marches un puits traverse', () => {
  const h = LANE_PITCH / 2
  /** Une marche sur la ligne `z0`, bombant de `bulge` (±h), de milieu x = 0. */
  const jog = (z0: number, bulge: number) => ({
    lane: 0,
    year: 2020,
    at: [0, z0] as Vec2,
    points: [
      [-h, z0],
      [0, z0 + bulge],
      [h, z0],
    ] as Vec2[],
  })
  const top = -10
  const shaft = (x: number, z: number): Vec2[] => [
    [x, top],
    [x, z],
  ]

  it('une marche d’une voie plus haute bloque, même bombée vers +Z : le puits la croiserait', () => {
    const upper = jog(0, +h)
    expect(underJog({ jogs: [upper] }, h / 2, LANE_PITCH)).toBe(true)
    // La raison : ses jambes sont en travers de la colonne.
    expect(() => expectNoCrossing([upper.points, shaft(h / 2, LANE_PITCH)])).toThrow(/se croisent/)
  })

  it('la marche de la voie visée : bloque vers −Z, pas vers +Z (sous la fin du puits)', () => {
    expect(underJog({ jogs: [jog(0, -h)] }, 0, 0)).toBe(true)
    expect(underJog({ jogs: [jog(0, +h)] }, 0, 0)).toBe(false)
    expectNoCrossing([jog(0, +h).points, shaft(h / 2, 0)])
  })

  it('une marche d’une rangée plus basse, ou hors de l’emprise en X, ne gêne pas', () => {
    expect(underJog({ jogs: [jog(20, -h)] }, 0, LANE_PITCH)).toBe(false)
    expect(underJog({ jogs: [jog(0, +h)] }, h + GRID / 2, LANE_PITCH)).toBe(false)
    expect(underJog({ jogs: [jog(0, +h)] }, h + GRID / 2 - 1e-6, LANE_PITCH)).toBe(true)
  })
})
