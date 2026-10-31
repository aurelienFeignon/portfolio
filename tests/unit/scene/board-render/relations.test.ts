import { describe, expect, it } from 'vitest'
import {
  makeBoardContent,
  makeLargeBoard,
  makeRealSizeBoard,
} from '../../../fixtures/builders/board'
import { entityPath, sectionPath } from '@/routing/paths'
import { buildBoardFile } from '@/scene/state/board/file'
import { instances, withJog } from '@/scene/state/board-render/geometry'
import type { Vec2 } from '@/scene/state/plane'
import {
  instanceLevels,
  isLitShape,
  LEVEL,
  LIT_SHAPES,
  PICKABLE_MESHES,
  litSegments,
  relationsOf,
  ribbonLevels,
  targetAtPoint,
  targetOfInstance,
} from '@/scene/state/board-render/relations'
import {
  type BoardTarget,
  hrefOf,
  sectionOf,
  tap,
  targetKey,
} from '@/scene/state/board-render/targets'

const real = buildBoardFile(makeRealSizeBoard(), {
  locale: 'fr',
  year: 2026,
  chipSizing: 'uniform',
})
const small = buildBoardFile(makeBoardContent(), {
  locale: 'fr',
  year: 2026,
  chipSizing: 'uniform',
})
// Construit hors des tests : le routage d'une grande carte dépasse le délai d'un test sous couverture.
const large = buildBoardFile(makeLargeBoard(), {
  locale: 'fr',
  year: 2026,
  chipSizing: 'uniform',
}).plan
const { plan } = real
const chips = plan.zones.flatMap((z) => z.chips)
const sorted = (set: ReadonlySet<string | number>) => [...set].sort()

describe('relationsOf — une puce', () => {
  // Une puce citée par deux projets : `technologies` de proj-main (0..30) et de proj-b (15..24).
  const shared = plan.traces.links.find(
    (l) =>
      l.project === 'proj-b' &&
      plan.traces.links.some((m) => m.skill === l.skill && m.project === 'proj-main'),
  )!.skill
  const r = relationsOf(real, { kind: 'chip', slug: shared })

  it('allume la puce elle-même, et elle seule', () => {
    expect(sorted(r.chips)).toEqual([shared])
  })

  it('les processeurs = les projets qui la citent', () => {
    expect(sorted(r.processors)).toEqual(['proj-b', 'proj-main'])
  })

  it('ses pistes : toutes celles qui portent une de ses liaisons, et rien d’autre', () => {
    expect(r.routes.size).toBeGreaterThan(0)
    plan.traces.routes.forEach((route, i) => {
      expect(r.routes.has(i)).toBe(route.links.some((l) => l.skill === shared))
    })
  })

  it('aucun tronçon ni année', () => {
    expect(r.segments.size).toBe(0)
    expect(r.years.size).toBe(0)
  })
})

describe('relationsOf — un processeur', () => {
  const r = relationsOf(real, { kind: 'processor', slug: 'proj-b' })

  it('ses compétences = ses technologies présentes sur la carte', () => {
    const expected = plan.traces.links.filter((l) => l.project === 'proj-b').map((l) => l.skill)
    expect(expected).toHaveLength(10)
    expect(sorted(r.chips)).toEqual([...expected].sort())
  })

  it('son tronçon de bus = son rattachement', () => {
    expect(sorted(r.segments)).toEqual(['exp-a'])
  })

  it('ses pistes comprennent sa prise au bus', () => {
    const tap = plan.traces.routes.findIndex((route) => route.busLink?.project === 'proj-b')
    expect(tap).toBeGreaterThanOrEqual(0)
    expect(r.routes.has(tap)).toBe(true)
    plan.traces.routes.forEach((route, i) => {
      const carries =
        route.links.some((l) => l.project === 'proj-b') || route.busLink?.project === 'proj-b'
      expect(r.routes.has(i)).toBe(carries)
    })
  })

  it('un projet sans rattachement n’allume aucun tronçon', () => {
    expect(relationsOf(real, { kind: 'processor', slug: 'proj-c' }).segments.size).toBe(0)
  })

  it('le processeur lui-même est allumé', () => {
    expect(sorted(r.processors)).toEqual(['proj-b'])
  })
})

describe('relationsOf — une année', () => {
  it('les employeurs actifs cette année-là', () => {
    expect(sorted(relationsOf(real, { kind: 'year', year: 2023 }).segments)).toEqual(['exp-a'])
    expect(sorted(relationsOf(real, { kind: 'year', year: 2025 }).segments)).toEqual([
      'exp-a',
      'exp-b',
    ])
  })

  it('les projets qui y sont rattachés, et leurs prises au bus', () => {
    const r = relationsOf(real, { kind: 'year', year: 2023 })
    const expected = plan.traces.busLinks.filter((b) => b.year === 2023).map((b) => b.project)
    expect(expected.length).toBeGreaterThan(0)
    expect(sorted(r.processors)).toEqual([...expected].sort())
    plan.traces.routes.forEach((route, i) => {
      expect(r.routes.has(i)).toBe(route.busLink?.year === 2023)
    })
    expect(sorted(r.years)).toEqual([2023])
  })

  it('une année sans poste n’allume rien du bus', () => {
    const r = relationsOf(small, { kind: 'year', year: 2020 })
    expect(r.segments.size).toBe(0)
    expect(r.processors.size).toBe(0)
  })
})

describe('relationsOf — un tronçon', () => {
  const r = relationsOf(real, { kind: 'segment', experience: 'exp-b' })

  it('son employeur et ses projets', () => {
    expect(sorted(r.segments)).toEqual(['exp-b'])
    expect(sorted(r.processors)).toEqual(['proj-main'])
    expect(r.chips.size).toBe(0)
  })

  it('les prises au bus de ses projets, et les années qu’il couvre', () => {
    plan.traces.routes.forEach((route, i) => {
      expect(r.routes.has(i)).toBe(route.busLink?.experience === 'exp-b')
    })
    const segment = plan.timeline.segments.find((s) => s.experience === 'exp-b')!
    for (const y of r.years) {
      expect(y).toBeGreaterThanOrEqual(segment.startYear)
      expect(y).toBeLessThanOrEqual(segment.endYear)
    }
    expect(r.years.size).toBe(segment.endYear - segment.startYear + 1)
  })
})

describe('hrefOf', () => {
  it('processeur → fiche du projet', () => {
    expect(hrefOf({ kind: 'processor', slug: 'proj-b' }, 'fr')).toBe(
      entityPath('fr', 'projects', 'proj-b'),
    )
  })
  it('tronçon → fiche de l’expérience', () => {
    expect(hrefOf({ kind: 'segment', experience: 'exp-a' }, 'en')).toBe(
      entityPath('en', 'experiences', 'exp-a'),
    )
  })
  it('puce → page des compétences (pas de fiche par compétence)', () => {
    expect(hrefOf({ kind: 'chip', slug: 'x' }, 'fr')).toBe(sectionPath('fr', 'skills'))
  })
  it('année → rien', () => {
    expect(hrefOf({ kind: 'year', year: 2023 }, 'fr')).toBeNull()
  })
})

describe('sectionOf, targetKey', () => {
  it('la section que la cible met en valeur', () => {
    expect(sectionOf({ kind: 'chip', slug: 'a' })).toBe('skills')
    expect(sectionOf({ kind: 'processor', slug: 'a' })).toBe('projects')
    expect(sectionOf({ kind: 'segment', experience: 'a' })).toBe('experiences')
    expect(sectionOf({ kind: 'year', year: 2020 })).toBe('experiences')
  })

  it('une clé par cible, vide sans cible', () => {
    const targets: BoardTarget[] = [
      { kind: 'chip', slug: 'a' },
      { kind: 'processor', slug: 'a' },
      { kind: 'segment', experience: 'a' },
      { kind: 'year', year: 2020 },
    ]
    expect(new Set(targets.map(targetKey)).size).toBe(4)
    expect(targetKey(null)).toBe('')
    expect(targetKey({ kind: 'chip', slug: 'a' })).toBe(targetKey({ kind: 'chip', slug: 'a' }))
  })
})

describe('targetOfInstance', () => {
  const nChips = chips.length
  const nCpu = plan.district.processors.length

  it('puce et diode → la puce', () => {
    expect(targetOfInstance(plan, 'chips', 3)).toEqual({ kind: 'chip', slug: chips[3]!.slug })
    expect(targetOfInstance(plan, 'leds', 3)).toEqual({ kind: 'chip', slug: chips[3]!.slug })
  })

  it('corps et capot d’un processeur → le processeur', () => {
    const slug = plan.district.processors[1]!.slug
    expect(targetOfInstance(plan, 'processors', 1)).toEqual({ kind: 'processor', slug })
    expect(targetOfInstance(plan, 'lids', 1)).toEqual({ kind: 'processor', slug })
  })

  it('jalon → l’année', () => {
    const year = plan.timeline.milestones[2]!.year
    expect(targetOfInstance(plan, 'milestones', 2)).toEqual({ kind: 'year', year })
  })

  it('l’ordre des lueurs est celui de `instances` (pour l’atténuation)', () => {
    expect(instances(plan, 'full').glows.count).toBe(
      nChips + nCpu + plan.timeline.milestones.length,
    )
  })

  it('une lueur ne désigne rien : elle déborde son objet (halo d’un processeur ×2,3)', () => {
    expect(targetOfInstance(plan, 'glows', 0)).toBeNull()
    expect(targetOfInstance(plan, 'glows', nChips)).toBeNull()
    expect(targetOfInstance(plan, 'glows', nChips + nCpu)).toBeNull()
  })

  it('une forme non désignable, ou hors bornes → rien', () => {
    expect(targetOfInstance(plan, 'pads', 0)).toBeNull()
    expect(targetOfInstance(plan, 'chips', 10_000)).toBeNull()
    expect(targetOfInstance(plan, 'lids', 10_000)).toBeNull()
    expect(targetOfInstance(plan, 'chips', undefined)).toBeNull()
  })
})

describe('PICKABLE_MESHES', () => {
  it('la plaque et les corps désignables, jamais les lueurs', () => {
    expect([...PICKABLE_MESHES].sort()).toEqual(
      ['chips', 'leds', 'lids', 'milestones', 'plate', 'processors'].sort(),
    )
    expect(PICKABLE_MESHES.has('glows')).toBe(false)
  })

  it('les lueurs restent atténuées avec leur objet', () => {
    expect(LIT_SHAPES).toContain('glows')
  })

  it('isLitShape reconnaît exactement LIT_SHAPES', () => {
    expect(isLitShape('glows')).toBe(true)
    expect(isLitShape('chips')).toBe(true)
    expect(isLitShape('vias')).toBe(false)
    expect(isLitShape('pads')).toBe(false)
  })
})

describe('targetAtPoint', () => {
  it('sur un tronçon du bus → le tronçon', () => {
    for (const segment of plan.timeline.segments) {
      const [a, b] = segment.points
      const mid = [(a![0] + b![0]) / 2, (a![1] + b![1]) / 2] as const
      // Un point du milieu d'une marche peut tomber sur un jalon : on vise la première arête.
      const hit = targetAtPoint(plan, mid[0], mid[1])
      expect(hit === null ? null : hit.kind).not.toBeNull()
    }
    const s = plan.timeline.segments[0]!
    const [a, b] = s.points
    const t = targetAtPoint(plan, a![0] + (b![0] - a![0]) * 0.37, a![1] + (b![1] - a![1]) * 0.37)
    expect(t).toEqual({ kind: 'segment', experience: s.experience })
  })

  it('sur un jalon → l’année', () => {
    const m = plan.timeline.milestones[0]!
    expect(targetAtPoint(plan, m.at[0], m.at[1])).toEqual({ kind: 'year', year: m.year })
  })

  it('tout le long de chaque tronçon, marches comprises : une cible du bus, jamais rien', () => {
    expect(large.timeline.jogs.length).toBeGreaterThan(0)
    const seen = new Set<string>()
    for (const segment of large.timeline.segments) {
      let points: readonly Vec2[] = segment.points
      for (const jog of large.timeline.jogs)
        if (jog.lane === segment.lane) points = withJog(points, jog)
      for (let i = 1; i < points.length; i++) {
        const [ax, az] = points[i - 1]!
        const [bx, bz] = points[i]!
        for (const t of [0, 0.25, 0.5, 0.75]) {
          const hit = targetAtPoint(large, ax + (bx - ax) * t, az + (bz - az) * t)
          expect(hit).not.toBeNull()
          if (hit?.kind === 'segment') seen.add(hit.experience)
        }
      }
    }
    expect(seen.size).toBe(large.timeline.segments.length)
  })

  it('loin du bus → rien', () => {
    expect(targetAtPoint(plan, plan.bounds.minX - 50, plan.bounds.minZ - 50)).toBeNull()
  })
})

describe('niveaux d’allumage', () => {
  it('sans survol : tout au neutre', () => {
    const levels = instanceLevels(plan, null)
    for (const values of Object.values(levels)) {
      expect([...values].every((v) => v === LEVEL.neutral)).toBe(true)
    }
    expect(levels.chips.length).toBe(chips.length)
    expect(levels.lids.length).toBe(plan.district.processors.length)
  })

  it('survol d’un processeur : ses puces allumées, les autres atténuées', () => {
    const r = relationsOf(real, { kind: 'processor', slug: 'proj-b' })
    const levels = instanceLevels(plan, r)
    chips.forEach((chip, i) => {
      const expected = r.chips.has(chip.slug) ? LEVEL.lit : LEVEL.dim
      expect(levels.chips[i]).toBe(expected)
      expect(levels.leds[i]).toBe(expected)
      expect(levels.glows[i]).toBe(expected)
    })
    plan.district.processors.forEach((cpu, j) => {
      const expected = cpu.slug === 'proj-b' ? LEVEL.lit : LEVEL.dim
      expect(levels.processors[j]).toBe(expected)
      expect(levels.lids[j]).toBe(expected)
      expect(levels.glows[chips.length + j]).toBe(expected)
    })
    expect([...levels.milestones].every((v) => v === LEVEL.dim)).toBe(true)
  })

  it('survol d’une année : son jalon allumé', () => {
    const levels = instanceLevels(plan, relationsOf(real, { kind: 'year', year: 2023 }))
    plan.timeline.milestones.forEach((m, k) => {
      expect(levels.milestones[k]).toBe(m.year === 2023 ? LEVEL.lit : LEVEL.dim)
    })
  })

  it('rubans : allumé si l’indice est dans l’ensemble, atténué sinon (−1 compris)', () => {
    const index = new Float32Array([0, 0, 1, 1, -1])
    const out = new Float32Array(5)
    expect([...ribbonLevels(index, new Set([1]), out)]).toEqual([
      LEVEL.dim,
      LEVEL.dim,
      LEVEL.lit,
      LEVEL.lit,
      LEVEL.dim,
    ])
    expect([...ribbonLevels(index, null, out)]).toEqual(Array(5).fill(LEVEL.neutral))
  })

  it('les tronçons allumés, par indice dans `timeline.segments`', () => {
    const r = relationsOf(real, { kind: 'segment', experience: 'exp-b' })
    const lit = litSegments(plan, r)
    plan.timeline.segments.forEach((s, i) => {
      expect(lit.has(i)).toBe(s.experience === 'exp-b')
    })
  })
})

describe('tap — souris et toucher', () => {
  const a: BoardTarget = { kind: 'processor', slug: 'a' }
  const b: BoardTarget = { kind: 'chip', slug: 'b' }

  it('souris : le clic navigue tout de suite', () => {
    expect(tap(null, a, 'mouse')).toEqual({ hover: a, navigate: true })
    expect(tap(a, null, 'mouse')).toEqual({ hover: null, navigate: false })
  })

  it('toucher : le premier allume, le second sur la même cible navigue', () => {
    expect(tap(null, a, 'touch')).toEqual({ hover: a, navigate: false })
    expect(tap(a, { ...a }, 'touch')).toEqual({ hover: a, navigate: true })
    expect(tap(a, b, 'touch')).toEqual({ hover: b, navigate: false })
    expect(tap(a, null, 'touch')).toEqual({ hover: null, navigate: false })
  })
})
