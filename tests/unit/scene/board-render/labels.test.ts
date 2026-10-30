/**
 * P8-15g — les étiquettes HTML de la carte, par vue (`carte-mere.md` §8) : lesquelles une vue
 * demande (`labelsForView`), et lesquelles restent visibles quand elles se chevauchent
 * (`placeLabels`, Review Focus 5).
 */
import { describe, expect, it } from 'vitest'

import { makeBoardContent, makeRealSizeBoard } from '../../../fixtures/builders/board'
import { buildBoardFile } from '@/scene/state/board/file'
import {
  HOVERED_PRIORITY,
  LABEL_GAP_PX,
  LABEL_HYSTERESIS_PX,
  LABEL_MARGIN_BOTTOM_PX,
  LABEL_LIFT,
  boardLabelId,
  labelsForView,
  placeLabels,
  targetLabelId,
  toScreen,
} from '@/scene/state/board-render/labels'

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
const { plan } = real
const ids = (labels: readonly { readonly id: string }[]) => labels.map((l) => l.id).sort()

describe('boardLabelId', () => {
  it('nomme chaque étiquette par son genre et sa clé', () => {
    expect(boardLabelId('section', 'skills')).toBe('section:skills')
    expect(boardLabelId('family', 'tooling')).toBe('family:tooling')
    expect(boardLabelId('project', 'proj-a')).toBe('project:proj-a')
  })
})

describe('labelsForView — la vue d’ensemble', () => {
  const labels = labelsForView(real, 'overview', null)

  it('nomme les trois sections, et rien d’autre', () => {
    expect(ids(labels)).toEqual(['section:experiences', 'section:projects', 'section:skills'])
  })

  /*
   * La hauteur d'une étiquette de section, en unités de la carte, à la vue d'ensemble : ~56 px
   * rendus (nom + accroche) pour une carte de ~32 unités affichée sur ~700 px (≈ 0,045 unité par
   * pixel), soit ≈ 2,5 unités à l'écran — et ≈ 3 unités de profondeur sur une plaque vue à 58°.
   * On exige une étiquette et demie : 4,5. (L'ancien placement, centres des boîtes cadrées, posait
   * Compétences à ~4 unités de Projets — empilées sur U1 à l'écran.)
   */
  const LABEL_HEIGHT_WORLD = 4.5
  const at = (section: string) => labels.find((l) => l.id === `section:${section}`)!.anchor

  it('⭐ trois ancres distinctes : plus d’une étiquette et demie entre chaque paire', () => {
    const anchors = ['projects', 'experiences', 'skills'].map(at)
    for (const [i, a] of anchors.entries()) {
      for (const b of anchors.slice(i + 1)) {
        expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(LABEL_HEIGHT_WORLD)
      }
    }
  })

  it('Projets au-dessus du processeur principal ; les deux autres hors du quartier', () => {
    const primary = plan.district.processors.find((p) => p.primary)!
    expect(at('projects')).toEqual([primary.labelAnchor[0], LABEL_LIFT, primary.labelAnchor[1]])
    const d = plan.district.bounds
    const inDistrict = ([x, , z]: readonly number[]) =>
      x! >= d.minX && x! <= d.maxX && z! >= d.minZ && z! <= d.maxZ
    expect(inDistrict(at('experiences'))).toBe(false)
    expect(inDistrict(at('skills'))).toBe(false)
  })

  it('Expériences au centre de la frise ; Compétences à l’ancre de la plus grande zone', () => {
    const t = plan.timeline.bounds
    expect(at('experiences')).toEqual([(t.minX + t.maxX) / 2, LABEL_LIFT, (t.minZ + t.maxZ) / 2])
    const area = (r: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
      (r.maxX - r.minX) * (r.maxZ - r.minZ)
    const largest = plan.zones.reduce((m, z) => (area(z.bounds) > area(m.bounds) ? z : m))
    expect(at('skills')).toEqual([largest.labelAnchor[0], LABEL_LIFT, largest.labelAnchor[1]])
  })

  it('à aire égale, la zone retenue est la première famille par identifiant', () => {
    const [z0, z1] = small.plan.zones
    const same = { ...z0!.bounds }
    const zones = [
      { ...z1!, bounds: same },
      { ...z0!, bounds: same },
    ]
    const first = [z0!, z1!].sort((a, b) => (a.family < b.family ? -1 : 1))[0]!
    const tied = { ...small, plan: { ...small.plan, zones } }
    const skills = labelsForView(tied, 'overview', null).find((l) => l.id === 'section:skills')!
    expect(skills.anchor).toEqual([first.labelAnchor[0], LABEL_LIFT, first.labelAnchor[1]])
  })

  it('sans zone ni processeur, Compétences et Projets retombent sur le centre du quartier', () => {
    const district = { ...plan.district, processors: [] }
    const empty = { ...real, plan: { ...plan, zones: [], district } }
    const d = plan.district.bounds
    const centre = [(d.minX + d.maxX) / 2, LABEL_LIFT, (d.minZ + d.maxZ) / 2]
    const out = labelsForView(empty, 'overview', null)
    expect(out.find((l) => l.id === 'section:skills')!.anchor).toEqual(centre)
    expect(out.find((l) => l.id === 'section:projects')!.anchor).toEqual(centre)
  })

  it('sans processeur principal, Projets prend le premier processeur', () => {
    const processors = plan.district.processors.map((p) => ({ ...p, primary: false }))
    const file = { ...real, plan: { ...plan, district: { ...plan.district, processors } } }
    const first = processors[0]!
    const projects = labelsForView(file, 'overview', null).find((l) => l.id === 'section:projects')!
    expect(projects.anchor).toEqual([first.labelAnchor[0], LABEL_LIFT, first.labelAnchor[1]])
  })
})

describe('labelsForView — la vue d’une section', () => {
  it('compétences : en permanence le nom de chaque famille, à son ancre', () => {
    const labels = labelsForView(real, 'skills', null)
    expect(ids(labels)).toEqual(plan.zones.map((z) => `family:${z.family}`).sort())
    expect(labels).toHaveLength(5)
    for (const zone of plan.zones) {
      const label = labels.find((l) => l.id === `family:${zone.family}`)!
      expect(label.anchor).toEqual([zone.labelAnchor[0], LABEL_LIFT, zone.labelAnchor[1]])
    }
  })

  it('expériences : en permanence chaque employeur, à l’ancre de son tronçon', () => {
    const labels = labelsForView(real, 'experiences', null)
    expect(ids(labels)).toEqual(['experience:exp-a', 'experience:exp-b'])
    const segment = plan.timeline.segments[0]!
    const label = labels.find((l) => l.id === `experience:${segment.experience}`)!
    expect(label.anchor).toEqual([segment.labelAnchor[0], LABEL_LIFT, segment.labelAnchor[1]])
  })

  it('projets : en permanence chaque projet, le principal devant les autres', () => {
    const labels = labelsForView(real, 'projects', null)
    expect(ids(labels)).toEqual(['project:proj-b', 'project:proj-c', 'project:proj-main'])
    const priority = (id: string) => labels.find((l) => l.id === id)!.priority
    expect(priority('project:proj-main')).toBeGreaterThan(priority('project:proj-b'))
    expect(priority('project:proj-b')).toBe(priority('project:proj-c'))
  })

  it('aucune étiquette de section dans la vue d’une section', () => {
    for (const focus of ['skills', 'experiences', 'projects'] as const) {
      expect(labelsForView(small, focus, null).some((l) => l.id.startsWith('section:'))).toBe(false)
    }
  })
})

describe('labelsForView — l’élément survolé, partout', () => {
  const chip = plan.zones[0]!.chips[0]!

  it('s’ajoute aux sections de la vue d’ensemble, en priorité maximale', () => {
    const labels = labelsForView(real, 'overview', { kind: 'chip', slug: chip.slug })
    expect(labels).toHaveLength(4)
    const hovered = labels.find((l) => l.id === `skill:${chip.slug}`)!
    expect(hovered.anchor).toEqual([chip.center[0], LABEL_LIFT, chip.center[1]])
    expect(hovered.priority).toBe(HOVERED_PRIORITY)
    expect(Math.max(...labels.map((l) => l.priority))).toBe(HOVERED_PRIORITY)
    expect(labels.filter((l) => l.priority === HOVERED_PRIORITY)).toHaveLength(1)
  })

  it('un processeur et un tronçon survolés se nomment à leur ancre', () => {
    const processor = plan.district.processors[0]!
    const p = labelsForView(real, 'skills', { kind: 'processor', slug: processor.slug })
    expect(p.find((l) => l.id === `project:${processor.slug}`)!.anchor).toEqual([
      processor.labelAnchor[0],
      LABEL_LIFT,
      processor.labelAnchor[1],
    ])
    const segment = plan.timeline.segments[1]!
    const s = labelsForView(real, 'overview', { kind: 'segment', experience: segment.experience })
    expect(s.find((l) => l.id === `experience:${segment.experience}`)!.priority).toBe(
      HOVERED_PRIORITY,
    )
  })

  it('déjà nommé par la vue, il n’est pas doublé : sa priorité monte', () => {
    const processor = plan.district.processors[0]!
    const labels = labelsForView(real, 'projects', { kind: 'processor', slug: processor.slug })
    expect(labels).toHaveLength(3)
    expect(labels.find((l) => l.id === `project:${processor.slug}`)!.priority).toBe(
      HOVERED_PRIORITY,
    )
  })

  it('une année ne s’étiquette pas (la sérigraphie la porte déjà), une cible absente non plus', () => {
    expect(labelsForView(real, 'overview', { kind: 'year', year: 2024 })).toHaveLength(3)
    expect(labelsForView(real, 'overview', { kind: 'chip', slug: 'absent' })).toHaveLength(3)
    expect(labelsForView(real, 'overview', { kind: 'processor', slug: 'absent' })).toHaveLength(3)
    expect(labelsForView(real, 'overview', { kind: 'segment', experience: 'absent' })).toHaveLength(
      3,
    )
  })
})

describe('placeLabels — les collisions (Review Focus 5)', () => {
  const zone = { x: 0, y: 0, width: 1600, height: 900 }
  // (x, y) : le milieu du bord BAS de l'étiquette.
  const label = (id: string, x: number, y: number, priority = 10, width = 200, height = 40) => ({
    id,
    x,
    y,
    width,
    height,
    priority,
  })
  /** Deux boîtes visibles qui se recouvrent, s'il en existe. */
  function overlapping(
    candidates: readonly ReturnType<typeof label>[],
    visible: ReadonlySet<string>,
  ) {
    const shown = candidates.filter((c) => visible.has(c.id))
    for (const a of shown) {
      for (const b of shown) {
        if (a === b) continue
        const apart =
          a.x + a.width / 2 <= b.x - b.width / 2 ||
          b.x + b.width / 2 <= a.x - a.width / 2 ||
          a.y <= b.y - b.height ||
          b.y <= a.y - a.height
        if (!apart) return [a.id, b.id]
      }
    }
    return null
  }

  it('deux étiquettes séparées restent visibles toutes les deux', () => {
    const visible = placeLabels([label('a', 300, 400), label('b', 900, 400)], zone)
    expect([...visible].sort()).toEqual(['a', 'b'])
  })

  it('deux qui se recouvrent : la plus prioritaire reste, l’autre se cache', () => {
    const visible = placeLabels([label('a', 500, 400, 10), label('b', 560, 410, 20)], zone)
    expect([...visible]).toEqual(['b'])
  })

  it('à priorité égale, le départage est stable : par identifiant', () => {
    const visible = placeLabels([label('z', 500, 400), label('m', 560, 410)], zone)
    expect([...visible]).toEqual(['m'])
  })

  it('⭐ l’élément survolé passe devant une étiquette permanente', () => {
    const visible = placeLabels(
      [label('family:a', 500, 400, 10), label('skill:x', 520, 395, HOVERED_PRIORITY)],
      zone,
    )
    expect([...visible]).toEqual(['skill:x'])
  })

  it('l’ordre d’entrée est sans effet', () => {
    const candidates = [
      label('a', 500, 400, 10),
      label('b', 560, 410, 20),
      label('c', 620, 420, 10),
      label('d', 1200, 400, 5),
      label('e', 1250, 420, 5),
    ]
    const expected = [...placeLabels(candidates, zone)].sort()
    for (const order of [[...candidates].reverse(), [2, 0, 4, 1, 3].map((i) => candidates[i]!)]) {
      expect([...placeLabels(order, zone)].sort()).toEqual(expected)
    }
  })

  it('⛔ jamais deux visibles superposées, sur une grappe dense', () => {
    // 60 étiquettes sur une grille serrée, priorités mêlées.
    const candidates = Array.from({ length: 60 }, (_, i) =>
      label(`l-${i}`, 200 + (i % 10) * 90, 200 + Math.floor(i / 10) * 25, (i * 7) % 4),
    )
    const visible = placeLabels(candidates, zone)
    expect(visible.size).toBeGreaterThan(0)
    expect(overlapping(candidates, visible)).toBeNull()
  })

  it('⛔ ancre hors de la zone : l’étiquette se cache, et ne cache personne', () => {
    const libre = { x: 600, y: 64, width: 1000, height: 836 }
    const visible = placeLabels(
      [label('dehors', 560, 400, 50), label('dedans', 760, 400, 10), label('haut', 1000, 40, 10)],
      libre,
    )
    // « dehors » : ancre sous le panneau (560 < 600) ; « haut » : ancre sous l'en-tête (40 < 64).
    expect([...visible]).toEqual(['dedans'])
  })

  it('⭐ ancre dans la zone, boîte qui déborde : ramenée dans la zone, visible', () => {
    const libre = { x: 600, y: 64, width: 1000, height: 836 }
    const bord = label('bord', 640, 80, 10)
    const fond = label('fond', 1590, 890, 10)
    const visible = placeLabels([bord, fond], libre)
    expect([...visible].sort()).toEqual(['bord', 'fond'])
    // Boîte de 200 × 40 : le milieu à 100 px du bord gauche, le bas 40 px sous le haut de la zone.
    expect([bord.x, bord.y]).toEqual([700, 104])
    // À droite et en bas : la marge basse de la zone est tenue.
    expect([fond.x, fond.y]).toEqual([1500, 900 - LABEL_MARGIN_BOTTOM_PX])
  })

  it('une boîte plus grande que la zone se cache', () => {
    const etroite = { x: 0, y: 0, width: 150, height: 900 }
    expect(placeLabels([label('large', 75, 400)], etroite).size).toBe(0)
  })

  it('ramenée dans la zone, une étiquette entre en collision à sa position RAMENÉE', () => {
    const libre = { x: 600, y: 64, width: 1000, height: 836 }
    // « a » ramenée à x = 700 recouvre « b », posée là.
    const visible = placeLabels([label('a', 610, 400, 20), label('b', 720, 400, 10)], libre)
    expect([...visible]).toEqual(['a'])
  })

  it('deux étiquettes gardent un écart d’au moins LABEL_GAP_PX entre elles', () => {
    const at = (x: number) => placeLabels([label('a', 300, 400), label('b', x, 400)], zone)
    expect(at(500 + LABEL_GAP_PX).size).toBe(2)
    expect(at(500 + LABEL_GAP_PX - 1).size).toBe(1)
  })
})

describe('placeLabels — l’hystérésis', () => {
  const zone = { x: 0, y: 0, width: 1600, height: 900 }
  const label = (id: string, x: number, y = 400) => ({
    id,
    x,
    y,
    width: 200,
    height: 40,
    priority: 10,
  })
  // « a » couvre [200, 400] ; « b » à 2 px : plus près que l'écart, sans recouvrement.
  const pair = () => [label('a', 300), label('b', 502)]

  it('une nouvelle venue trop proche se cache', () => {
    expect([...placeLabels(pair(), zone)]).toEqual(['a'])
  })

  it('⭐ déjà visible, elle reste tant que le jeu n’est pas dépassé', () => {
    expect([...placeLabels(pair(), zone, new Set(['a', 'b']))].sort()).toEqual(['a', 'b'])
  })

  it('⛔ mais jamais en recouvrement réel, même déjà visible', () => {
    const visible = placeLabels([label('a', 300), label('b', 499)], zone, new Set(['a', 'b']))
    expect([...visible]).toEqual(['a'])
  })

  it('⭐ une ancre déjà visible tolère LABEL_HYSTERESIS_PX hors de la zone', () => {
    const libre = { x: 600, y: 0, width: 1000, height: 900 }
    const juste = 600 - LABEL_HYSTERESIS_PX
    expect(placeLabels([label('a', juste)], libre).size).toBe(0)
    expect(placeLabels([label('a', juste)], libre, new Set(['a'])).size).toBe(1)
    expect(placeLabels([label('a', juste - 1)], libre, new Set(['a'])).size).toBe(0)
  })

  it('remplit l’ensemble fourni, vidé d’abord', () => {
    const into = new Set(['vieux'])
    const out = placeLabels([label('a', 300)], zone, undefined, into)
    expect(out).toBe(into)
    expect([...into]).toEqual(['a'])
  })
})

describe('toScreen', () => {
  const c = () => ({ id: 'a', x: 0, y: 0, width: 10, height: 10, priority: 0 })

  it('convertit la projection en pixels : le centre au centre, le coin haut gauche à 0', () => {
    const centre = c()
    expect(toScreen(centre, 0, 0, 0.5, 1600, 900)).toBe(true)
    expect([centre.x, centre.y]).toEqual([800, 450])
    const coin = c()
    toScreen(coin, -1, 1, 0.5, 1600, 900)
    expect([coin.x, coin.y]).toEqual([0, 0])
  })

  it('⛔ cache une ancre derrière la caméra, ou au-delà du plan lointain', () => {
    expect(toScreen(c(), 0, 0, 1.2, 1600, 900)).toBe(false)
    expect(toScreen(c(), 0, 0, -1.2, 1600, 900)).toBe(false)
  })
})

describe('targetLabelId', () => {
  it('nomme la cible par l’étiquette qui la désigne ; une année n’en a pas', () => {
    expect(targetLabelId({ kind: 'chip', slug: 's' })).toBe('skill:s')
    expect(targetLabelId({ kind: 'processor', slug: 'p' })).toBe('project:p')
    expect(targetLabelId({ kind: 'segment', experience: 'e' })).toBe('experience:e')
    expect(targetLabelId({ kind: 'year', year: 2024 })).toBeNull()
  })
})
