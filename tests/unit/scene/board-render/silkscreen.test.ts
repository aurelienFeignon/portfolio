import { describe, expect, it } from 'vitest'
import { makeLargeBoard, makeRealSizeBoard } from '../../../fixtures/builders/board'
import { buildBoardFile } from '@/scene/state/board/file'
import { inflate, rectsOverlap } from '@/scene/state/board/rect'
import {
  BOARD_REFERENCE,
  canvasMapping,
  fineTraces,
  silkscreenFrames,
  silkscreenItems,
} from '@/scene/state/board-render/silkscreen'

const real = buildBoardFile(makeRealSizeBoard(), {
  locale: 'fr',
  year: 2026,
  chipSizing: 'uniform',
})
const large = buildBoardFile(makeLargeBoard(), { locale: 'fr', year: 2026, chipSizing: 'uniform' })

/** Ce que la sérigraphie a le droit d'écrire : des années, des repères, la référence de carte. */
const ALLOWED = /^(?:\d{4}|U\d+|IC\d+|R\d+|C\d+)$/

describe('silkscreenItems', () => {
  for (const [name, file] of [
    ['taille réelle', real],
    ['grand banc', large],
  ] as const) {
    it(`${name} : aucun texte de contenu — que des chiffres et des repères`, () => {
      const items = silkscreenItems(file)
      const slugs = new Set([
        ...file.plan.zones.flatMap((z) => [z.family, ...z.chips.map((c) => c.slug)]),
        ...file.plan.district.processors.map((p) => p.slug),
        ...file.plan.timeline.segments.map((s) => s.experience),
      ])
      for (const { text } of items) {
        expect(slugs.has(text)).toBe(false)
        expect(text === BOARD_REFERENCE || ALLOWED.test(text)).toBe(true)
      }
    })
  }

  it('une année par jalon, un repère par puce et par processeur, la référence une fois', () => {
    const texts = silkscreenItems(real).map((i) => i.text)
    for (const m of real.plan.timeline.milestones) expect(texts).toContain(String(m.year))
    for (const c of real.plan.zones.flatMap((z) => z.chips)) expect(texts).toContain(c.ref)
    for (const p of real.plan.district.processors) expect(texts).toContain(p.ref)
    expect(texts.filter((t) => t === BOARD_REFERENCE)).toHaveLength(1)
  })

  it('les repères des petits composants suivent le palier : les N premiers seulement', () => {
    const none = silkscreenItems(real, 0).map((i) => i.text)
    expect(none.some((t) => /^[RC]\d+$/.test(t))).toBe(false)
    const five = silkscreenItems(real, 5).map((i) => i.text)
    expect(five.filter((t) => /^[RC]\d+$/.test(t))).toEqual(
      real.plan.passives.slice(0, 5).map((p) => p.ref),
    )
  })

  it('tout est sur la carte, à une taille lisible', () => {
    const b = real.plan.bounds
    for (const { at, size } of silkscreenItems(real)) {
      expect(size).toBeGreaterThan(0.05)
      expect(at[0]).toBeGreaterThan(b.minX)
      expect(at[0]).toBeLessThan(b.maxX)
      expect(at[1]).toBeGreaterThan(b.minZ)
      expect(at[1]).toBeLessThan(b.maxZ)
    }
  })

  it('les années se posent du côté extérieur de la voie 0, hors des fils', () => {
    const t = large.plan.timeline
    const years = silkscreenItems(large).filter((i) => /^\d{4}$/.test(i.text))
    expect(years).toHaveLength(t.milestones.length)
    years.forEach((item, i) => {
      const m = t.milestones[i]!
      expect(item.at[0]).toBeCloseTo(m.at[0], 6)
      expect(Math.abs(item.at[1] - m.at[1])).toBeGreaterThan(0.4)
    })
  })
})

describe('silkscreenFrames', () => {
  it('un cadre par zone, par processeur et par puce, plus le liseré de la carte', () => {
    const frames = silkscreenFrames(real.plan)
    const chips = real.plan.zones.flatMap((z) => z.chips)
    expect(frames.filter((f) => f.kind === 'zone')).toHaveLength(real.plan.zones.length)
    expect(frames.filter((f) => f.kind === 'processor')).toHaveLength(
      real.plan.district.processors.length,
    )
    expect(frames.filter((f) => f.kind === 'chip')).toHaveLength(chips.length)
    expect(frames.filter((f) => f.kind === 'board')).toHaveLength(1)
  })

  it('le cadre de zone porte la teinte de sa famille', () => {
    const zoneFrames = silkscreenFrames(real.plan).filter((f) => f.kind === 'zone')
    zoneFrames.forEach((f, i) => expect(f.tone).toBe(real.plan.zones[i]!.tone))
  })
})

describe('fineTraces', () => {
  const traces = fineTraces(real.plan, 200, 7)

  it('déterministe pour une graine donnée', () => {
    expect(fineTraces(real.plan, 200, 7)).toEqual(traces)
    expect(fineTraces(real.plan, 200, 8)).not.toEqual(traces)
  })

  it('au plus `count` tracés, octilinéaires, sur la carte, hors des zones et du quartier', () => {
    expect(traces.length).toBeGreaterThan(20)
    expect(traces.length).toBeLessThanOrEqual(200)
    const busy = [
      ...real.plan.zones.map((z) => z.bounds),
      real.plan.district.bounds,
      real.plan.timeline.bounds,
    ].map((r) => inflate(r, 0.2))
    for (const line of traces) {
      expect(line.length).toBeGreaterThanOrEqual(2)
      for (let i = 1; i < line.length; i++) {
        const dx = Math.abs(line[i]![0] - line[i - 1]![0])
        const dz = Math.abs(line[i]![1] - line[i - 1]![1])
        expect(dx < 1e-9 || dz < 1e-9 || Math.abs(dx - dz) < 1e-9).toBe(true)
        expect(dx + dz).toBeGreaterThan(0)
      }
      for (const [x, z] of line) {
        expect(x).toBeGreaterThanOrEqual(real.plan.bounds.minX)
        expect(x).toBeLessThanOrEqual(real.plan.bounds.maxX)
        expect(z).toBeGreaterThanOrEqual(real.plan.bounds.minZ)
        expect(z).toBeLessThanOrEqual(real.plan.bounds.maxZ)
        const point = { minX: x, maxX: x, minZ: z, maxZ: z }
        expect(busy.some((r) => rectsOverlap(r, point))).toBe(false)
      }
    }
  })

  it('zéro demandé, zéro rendu', () => {
    expect(fineTraces(real.plan, 0, 1)).toEqual([])
  })
})

describe('canvasMapping', () => {
  const bounds = { minX: -10, minZ: -5, maxX: 10, maxZ: 5 }

  it('pose les coins de la carte aux coins du canvas', () => {
    const map = canvasMapping(bounds, 50, 4096)
    expect(map.width).toBe(1000)
    expect(map.height).toBe(500)
    expect(map.toPx([-10, -5])).toEqual([0, 0])
    expect(map.toPx([10, 5])).toEqual([1000, 500])
    expect(map.scale).toBe(50)
  })

  it('borne la plus grande dimension, en gardant les proportions', () => {
    const map = canvasMapping(bounds, 500, 2048)
    expect(map.width).toBe(2048)
    expect(map.height).toBe(1024)
    expect(map.scale).toBeCloseTo(102.4, 6)
  })
})
