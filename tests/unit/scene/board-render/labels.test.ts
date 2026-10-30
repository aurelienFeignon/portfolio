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
  LABEL_LIFT,
  boardLabelId,
  labelsForView,
  placeLabels,
  targetLabelId,
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

  it('pose chaque section au centre de ce que cadre sa vue, levée au-dessus de la plaque', () => {
    const at = (section: string) => labels.find((l) => l.id === `section:${section}`)!.anchor
    const d = plan.district.bounds
    expect(at('projects')).toEqual([(d.minX + d.maxX) / 2, LABEL_LIFT, (d.minZ + d.maxZ) / 2])
    const t = plan.timeline.bounds
    expect(at('experiences')).toEqual([(t.minX + t.maxX) / 2, LABEL_LIFT, (t.minZ + t.maxZ) / 2])
    const minX = Math.min(...plan.zones.map((z) => z.bounds.minX))
    const maxX = Math.max(...plan.zones.map((z) => z.bounds.maxX))
    const minZ = Math.min(...plan.zones.map((z) => z.bounds.minZ))
    const maxZ = Math.max(...plan.zones.map((z) => z.bounds.maxZ))
    expect(at('skills')).toEqual([(minX + maxX) / 2, LABEL_LIFT, (minZ + maxZ) / 2])
  })

  it('sans zone de compétences, l’étiquette des compétences retombe sur le quartier', () => {
    const empty = { ...real, plan: { ...plan, zones: [] } }
    const at = labelsForView(empty, 'overview', null).find((l) => l.id === 'section:skills')!
    const d = plan.district.bounds
    expect(at.anchor).toEqual([(d.minX + d.maxX) / 2, LABEL_LIFT, (d.minZ + d.maxZ) / 2])
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
  // (x, y) : le milieu du bord BAS de l'étiquette, comme `labelPlacement`.
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

  it('⛔ une étiquette qui sort de la zone se cache, et ne cache personne', () => {
    const libre = { x: 600, y: 64, width: 1000, height: 836 }
    const visible = placeLabels(
      [label('dehors', 640, 400, 50), label('dedans', 760, 400, 10), label('haut', 1000, 80, 10)],
      libre,
    )
    // « dehors » mord le panneau (640 − 100 < 600) ; « haut » passe sous l'en-tête (80 − 40 < 64).
    expect([...visible]).toEqual(['dedans'])
  })

  it('deux étiquettes gardent un écart d’au moins LABEL_GAP_PX entre elles', () => {
    const at = (x: number) => placeLabels([label('a', 300, 400), label('b', x, 400)], zone)
    expect(at(500 + LABEL_GAP_PX).size).toBe(2)
    expect(at(500 + LABEL_GAP_PX - 1).size).toBe(1)
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
