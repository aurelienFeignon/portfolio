/**
 * P8-14a — l'extrait de contenu et les rectangles de la carte mère.
 */
import { describe, expect, it } from 'vitest'

import { skillFrontmatterSchema } from '@/content/schemas/skill'
import { compareSlugs, SKILL_FAMILIES, toBoardContent, yearOf } from '@/scene/state/board/content'
import {
  inflate,
  type Rect,
  rectCenter,
  rectOf,
  rectsOverlap,
  rectUnion,
} from '@/scene/state/board/rect'
import { PALETTE, TONES } from '@/scene/state/layout'
import {
  makeBoardContent,
  makeLargeBoard,
  makeRealSizeBoard,
  makeSaturatedBoard,
} from '../../../fixtures/builders/board'

describe('l’extrait de contenu', () => {
  it('lit l’année d’une date à toute précision', () => {
    expect([yearOf('2021'), yearOf('2021-03'), yearOf('2021-03-14')]).toEqual([2021, 2021, 2021])
  })

  it('ne copie que les champs que la carte lit', () => {
    const board = toBoardContent({
      skills: [{ slug: 'ts', category: 'language', level: 4, name: 'TypeScript' } as never],
      experiences: [{ slug: 'x', startedAt: '2021', company: 'X' } as never],
      projects: [
        {
          slug: 'p',
          startedAt: '2025-01-02',
          technologies: ['ts'],
          primary: true,
          title: 'P',
          body: '…',
        } as never,
      ],
    })
    expect(board).toEqual({
      skills: [{ slug: 'ts', family: 'language', level: 4 }],
      experiences: [{ slug: 'x', startYear: 2021, endYear: null }],
      projects: [
        {
          slug: 'p',
          startedAt: '2025-01-02',
          technologies: ['ts'],
          primary: true,
          experience: null,
        },
      ],
    })
  })

  it('lit la fin d’une expérience et le rattachement d’un projet', () => {
    const board = toBoardContent({
      skills: [],
      experiences: [{ slug: 'x', startedAt: '2021-03', endedAt: '2023-11-30' }],
      projects: [
        { slug: 'p', startedAt: '2022', technologies: [], primary: false, experience: 'x' },
      ],
    })
    expect(board.experiences[0]).toEqual({ slug: 'x', startYear: 2021, endYear: 2023 })
    expect(board.projects[0]?.experience).toBe('x')
  })

  it('suit l’ordre des familles du schéma de compétence', () => {
    expect(SKILL_FAMILIES).toEqual(skillFrontmatterSchema.shape.category.options)
  })
})

describe('les rectangles', () => {
  it('construit un rectangle autour de son centre', () => {
    const r = rectOf([2, -1], 4, 2)
    expect(r).toEqual({ minX: 0, minZ: -2, maxX: 4, maxZ: 0 })
    expect(rectCenter(r)).toEqual([2, -1])
  })

  it('rend null pour une union vide, l’englobant sinon', () => {
    expect(rectUnion([])).toBeNull()
    const a = rectOf([0, 0], 2, 2)
    const b = rectOf([5, 3], 2, 2)
    expect(rectUnion([a, b])).toEqual({ minX: -1, minZ: -1, maxX: 6, maxZ: 4 })
  })

  it('élargit et rétrécit', () => {
    const r: Rect = { minX: 0, minZ: 0, maxX: 2, maxZ: 2 }
    expect(inflate(r, 1)).toEqual({ minX: -1, minZ: -1, maxX: 3, maxZ: 3 })
    expect(inflate(r, -0.5)).toEqual({ minX: 0.5, minZ: 0.5, maxX: 1.5, maxZ: 1.5 })
  })

  it('un contact exact à `gap` n’est pas un recouvrement', () => {
    const a: Rect = { minX: 0, minZ: 0, maxX: 2, maxZ: 2 }
    const b: Rect = { minX: 3, minZ: 0, maxX: 5, maxZ: 2 }
    expect(rectsOverlap(a, b)).toBe(false)
    expect(rectsOverlap(a, b, 1)).toBe(false) // écart = 1, pas strictement inférieur
    expect(rectsOverlap(a, b, 1.01)).toBe(true)
    expect(rectsOverlap(a, { ...b, minX: 1 })).toBe(true)
    // Séparés en Z seulement.
    expect(rectsOverlap(a, { minX: 0, minZ: 5, maxX: 2, maxZ: 6 }, 1)).toBe(false)
  })
})

describe('la palette', () => {
  it('porte amber et teal, dans l’ordre des tons', () => {
    expect(PALETTE.amber).toBe('#F5B342')
    expect(PALETTE.teal).toBe('#2DD4BF')
    expect(TONES).toEqual(['cyan', 'violet', 'sky', 'amber', 'teal'])
  })
})

describe('les fixtures aux dimensions du contenu réel', () => {
  it('reproduit les dimensions annoncées', () => {
    const real = makeRealSizeBoard()
    expect(real.skills).toHaveLength(40)
    const counts = SKILL_FAMILIES.map((f) => real.skills.filter((s) => s.family === f).length)
    expect(counts).toEqual([2, 13, 3, 11, 11])
    expect(real.skills.every((s) => s.level >= 3)).toBe(true)
    expect(real.experiences.map((e) => [e.startYear, e.endYear])).toEqual([
      [2021, null],
      [2025, null],
    ])
    expect(real.projects.map((p) => p.technologies.length)).toEqual([31, 10, 7])
    expect(real.projects.filter((p) => p.primary)).toHaveLength(1)
    const slugs = new Set(real.skills.map((s) => s.slug))
    expect(real.projects.flatMap((p) => p.technologies).every((t) => slugs.has(t))).toBe(true)
  })

  it('le petit contenu : 6 compétences sur 3 familles, 2 expériences, 2 projets', () => {
    const c = makeBoardContent()
    expect(c.skills).toHaveLength(6)
    expect(new Set(c.skills.map((s) => s.family)).size).toBe(3)
    expect(c.experiences).toHaveLength(2)
    expect(c.projects).toHaveLength(2)
  })

  it('le grand contenu : 20 années, 20 projets, 80 compétences', () => {
    const l = makeLargeBoard()
    expect(l.skills).toHaveLength(80)
    expect(l.projects).toHaveLength(20)
    expect(l.experiences).toHaveLength(20)
    const years = new Set(l.projects.map((p) => yearOf(p.startedAt)))
    expect(years.size).toBe(20)
    for (let y = 2006; y < 2026; y += 1) {
      const live = l.experiences.filter((e) => e.startYear <= y && (e.endYear ?? y) >= y)
      expect(live.length).toBeLessThanOrEqual(3)
    }
  })

  it('le contenu saturé : un projet, 200 compétences d’une famille', () => {
    const s = makeSaturatedBoard()
    expect(s.projects).toHaveLength(1)
    expect(s.projects[0]?.technologies).toHaveLength(200)
    expect(new Set(s.skills.map((k) => k.family)).size).toBe(1)
  })
})

describe('compareSlugs', () => {
  it('ordonne par unités de code, égalité comprise', () => {
    expect(compareSlugs('a', 'b')).toBe(-1)
    expect(compareSlugs('b', 'a')).toBe(1)
    expect(compareSlugs('a', 'a')).toBe(0)
    // Majuscules avant minuscules : jamais l'ordre de la locale.
    expect(['b', 'B', 'a'].sort(compareSlugs)).toEqual(['B', 'a', 'b'])
  })
})
