import { describe, expect, it } from 'vitest'

import {
  BUS_LENGTH,
  LANE_PITCH,
  planTimeline,
  type Timeline,
  yearPoint,
} from '@/scene/state/board/timeline'
import { makeBoardExperience, makeLargeBoard } from '../../../fixtures/builders/board'
import { expectNoCrossing, expectOctilinear, onPolyline } from './geometry-asserts'

const exp = makeBoardExperience

/**
 * Aucun tronçon ne commence ni ne finit dans le vide : son premier point — et
 * son dernier, sauf poste en cours — est posé sur un autre tronçon ou sur la
 * voie 0 (`spine`), à ε près.
 */
function expectAttached(t: Timeline): void {
  const wired = (p: readonly [number, number], self: number) =>
    onPolyline(p, t.spine, 1e-6) ||
    t.segments.some((o, j) => j !== self && onPolyline(p, o.points, 1e-6))
  t.segments.forEach((s, i) => {
    expect(wired(s.points[0]!, i), `${s.experience} commence dans le vide`).toBe(true)
    if (!s.ongoing)
      expect(wired(s.points.at(-1)!, i), `${s.experience} finit dans le vide`).toBe(true)
  })
}

describe('planTimeline', () => {
  it('un pas par année, la frise garde sa longueur', () => {
    const t = planTimeline([exp({ startYear: 2021, endYear: null })], 2026, 6)
    expect([t.firstYear, t.lastYear, t.rows]).toEqual([2021, 2026, 1])
    expect(t.step * 6).toBeCloseTo(BUS_LENGTH)
  })

  it('porte son origine en Z : la voie 0 y commence', () => {
    const t = planTimeline([exp({ startYear: 2015, endYear: null })], 2026, 6.5)
    expect(t.originZ).toBe(6.5)
    expect(t.spine[0]![1]).toBe(6.5)
    expect(yearPoint(t, 2015, 0)[1]).toBe(6.5)
  })

  it('fait un lacet au-delà de 8 années, et un second au-delà de 16', () => {
    expect(planTimeline([exp({ startYear: 2015, endYear: null })], 2026, 6).rows).toBe(2)
    expect(planTimeline([exp({ startYear: 2005, endYear: null })], 2026, 6).rows).toBe(3)
  })

  it('dédouble le bus pour deux postes simultanés, et réutilise une voie libérée', () => {
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2018, endYear: 2026 }),
        exp({ slug: 'b', startYear: 2020, endYear: 2021 }),
        exp({ slug: 'c', startYear: 2023, endYear: null }),
      ],
      2026,
      6,
    )
    expect(t.lanes).toBe(2)
    expect(t.segments.map((s) => [s.experience, s.lane])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 1],
    ])
  })

  it('éteint les années sans poste', () => {
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2018, endYear: 2019 }),
        exp({ slug: 'b', startYear: 2022, endYear: null }),
      ],
      2026,
      6,
    )
    expect(t.idleYears).toEqual([2020, 2021])
  })

  it('marque d’un décrochement le changement d’employeur sur une même voie', () => {
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2018, endYear: 2020 }),
        exp({ slug: 'b', startYear: 2021, endYear: null }),
      ],
      2026,
      6,
    )
    expect(t.jogs).toEqual([expect.objectContaining({ lane: 0, year: 2021 })])
  })

  it('horloge en retard : le bus couvre quand même toutes les expériences', () => {
    expect(planTimeline([exp({ startYear: 2027, endYear: null })], 2026, 6).lastYear).toBe(2027)
  })

  it('sans expérience : une seule année, éteinte', () => {
    const t = planTimeline([], 2026, 6)
    expect([t.firstYear, t.lastYear, t.idleYears, t.segments]).toEqual([2026, 2026, [2026], []])
  })

  it('tous les segments sont horizontaux, verticaux ou à 45°, lacets et dédoublements compris', () => {
    const t = planTimeline(makeLargeBoard().experiences, 2026, 6)
    expect(t.rows).toBeGreaterThan(1)
    expect(t.lanes).toBeGreaterThan(1)
    for (const s of t.segments) expectOctilinear(s.points)
    expectOctilinear(t.spine)
  })

  it('un jalon par année, dans l’ordre de la frise', () => {
    const t = planTimeline(makeLargeBoard().experiences, 2026, 6)
    expect(t.milestones.map((m) => m.year)).toEqual(
      Array.from({ length: t.lastYear - t.firstYear + 1 }, (_, i) => t.firstYear + i),
    )
  })

  it('lacet : les rangées paires vont à droite, les impaires à gauche', () => {
    const t = planTimeline([exp({ startYear: 2015, endYear: null })], 2026, 6)
    const first = yearPoint(t, 2015, 0)
    const second = yearPoint(t, 2016, 0)
    const ninth = yearPoint(t, 2023, 0)
    const tenth = yearPoint(t, 2024, 0)
    expect(second[0]).toBeGreaterThan(first[0])
    expect(tenth[0]).toBeLessThan(ninth[0])
    expect(ninth[1]).toBeGreaterThan(first[1])
    expect(ninth[0]).toBeGreaterThan(0)
    expect(first[0]).toBeLessThan(0)
  })

  it('une voie secondaire part de la voie 0 et rejoint, sauf en cours', () => {
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2018, endYear: null }),
        exp({ slug: 'b', startYear: 2020, endYear: 2023 }),
        exp({ slug: 'c', startYear: 2024, endYear: null }),
      ],
      2026,
      6,
    )
    const z0 = 6
    const b = t.segments.find((s) => s.experience === 'b')!
    expect(b.points[0]![1]).toBeCloseTo(z0)
    expect(b.points.at(-1)![1]).toBeCloseTo(z0)
    expect(Math.max(...b.points.map((p) => p[1]))).toBeGreaterThan(z0)
    const c = t.segments.find((s) => s.experience === 'c')!
    expect(c.lane).toBe(1)
    expect(c.ongoing).toBe(true)
    expect(c.points.at(-1)![1]).toBeGreaterThan(z0)
  })

  it('les bornes enferment toutes les voies et les demi-tours', () => {
    const t = planTimeline(makeLargeBoard().experiences, 2026, 6)
    const pts = [...t.spine, ...t.segments.flatMap((s) => s.points)]
    for (const [x, z] of pts) {
      expect(x).toBeGreaterThanOrEqual(t.bounds.minX - 1e-9)
      expect(x).toBeLessThanOrEqual(t.bounds.maxX + 1e-9)
      expect(z).toBeGreaterThanOrEqual(t.bounds.minZ - 1e-9)
      expect(z).toBeLessThanOrEqual(t.bounds.maxZ + 1e-9)
    }
  })

  it('un poste très court sur une voie haute reste à 45°', () => {
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2020, endYear: 2026 }),
        exp({ slug: 'b', startYear: 2020, endYear: 2026 }),
        exp({ slug: 'c', startYear: 2020, endYear: 2026 }),
        exp({ slug: 'd', startYear: 2020, endYear: 2026 }),
        exp({ slug: 'e', startYear: 2021, endYear: 2021 }),
      ],
      2026,
      0,
    )
    expect(t.lanes).toBe(5)
    for (const s of t.segments) expectOctilinear(s.points)
  })

  it('ne dépend pas de l’ordre d’entrée', () => {
    const e = makeLargeBoard().experiences
    expect(planTimeline([...e].reverse(), 2026, 6)).toEqual(planTimeline(e, 2026, 6))
  })

  it('aucune paire de tronçons ne se croise (lacets et trois voies)', () => {
    const t = planTimeline(makeLargeBoard().experiences, 2026, 6)
    expect(t.rows).toBeGreaterThan(1)
    expect(t.lanes).toBe(3)
    expectNoCrossing(t.segments.map((s) => s.points))
  })

  it('un poste de voie haute qui franchit un lacet ne croise rien', () => {
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2015, endYear: null }),
        exp({ slug: 'b', startYear: 2020, endYear: 2025 }),
        exp({ slug: 'c', startYear: 2021, endYear: 2024 }),
        exp({ slug: 'd', startYear: 2022, endYear: 2023 }),
      ],
      2026,
      6,
    )
    expect(t.rows).toBe(2)
    expect(t.lanes).toBe(4)
    for (const s of t.segments) expectOctilinear(s.points)
    expectNoCrossing(t.segments.map((s) => s.points))
    expectNoCrossing(
      [t.spine, ...t.segments.filter((s) => s.lane > 0).map((s) => s.points)],
      (i) => (i === 0 ? 0 : i),
    )
  })

  it('la voie k part de la voie k−1 et rejoint la plus haute voie encore occupée', () => {
    const z0 = 6
    const base = [
      exp({ slug: 'a', startYear: 2018, endYear: null }),
      exp({ slug: 'b', startYear: 2019, endYear: null }),
    ]
    const occupied = planTimeline(
      [...base, exp({ slug: 'c', startYear: 2020, endYear: 2021 })],
      2026,
      z0,
    )
    const c = occupied.segments.find((s) => s.experience === 'c')!
    expect(c.lane).toBe(2)
    expect(c.points[0]![1]).toBeCloseTo(z0 + LANE_PITCH)
    expect(c.points.at(-1)![1]).toBeCloseTo(z0 + LANE_PITCH)

    const freed = planTimeline(
      [
        exp({ slug: 'a', startYear: 2018, endYear: null }),
        exp({ slug: 'b', startYear: 2019, endYear: 2021 }),
        exp({ slug: 'c', startYear: 2020, endYear: 2023 }),
      ],
      2026,
      z0,
    )
    const c2 = freed.segments.find((s) => s.experience === 'c')!
    expect(c2.points.at(-1)![1]).toBeCloseTo(z0)
    expectNoCrossing(freed.segments.map((s) => s.points))
  })

  it('deux postes consécutifs sur une voie se suivent sans trou, même à travers un lacet', () => {
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2015, endYear: 2022 }),
        exp({ slug: 'b', startYear: 2023, endYear: null }),
      ],
      2026,
      6,
    )
    expect(t.rows).toBe(2)
    const [a, b] = t.segments
    expect(b!.points[0]).toEqual(a!.points.at(-1))
    for (const s of t.segments) expectOctilinear(s.points)
  })

  it('les tronçons du grand contenu partent et finissent sur un fil', () => {
    expectAttached(planTimeline(makeLargeBoard().experiences, 2026, 6))
  })

  it('rejoint une voie encore à sa hauteur, pas une voie qui redescend la même année', () => {
    // B (voie 1) et C (voie 2) finissent en 2023 : B redescend dans cette case,
    // C ne peut pas le rejoindre à la hauteur de la voie 1 — il n'y a plus de fil.
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2018, endYear: null }),
        exp({ slug: 'b', startYear: 2019, endYear: 2023 }),
        exp({ slug: 'c', startYear: 2020, endYear: 2023 }),
      ],
      2026,
      6,
    )
    expect(t.segments.map((s) => s.lane)).toEqual([0, 1, 2])
    expectAttached(t)
    expectNoCrossing(t.segments.map((s) => s.points))
  })

  it('part d’une voie déjà à sa hauteur, pas d’une voie qui monte la même année', () => {
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2020, endYear: null }),
        exp({ slug: 'b', startYear: 2020, endYear: 2024 }),
        exp({ slug: 'c', startYear: 2020, endYear: null }),
      ],
      2026,
      6,
    )
    expect(t.segments.map((s) => s.lane)).toEqual([0, 1, 2])
    expectAttached(t)
    expectNoCrossing(t.segments.map((s) => s.points))
    for (const s of t.segments) expectOctilinear(s.points)
  })

  it('un poste trop court pour rejoindre sa voie cible monte et descend à mi-chemin, à 45°', () => {
    const z0 = 6
    const t = planTimeline(
      [
        exp({ slug: 'a', startYear: 2020, endYear: null }),
        ...['b', 'c', 'd', 'e', 'f'].map((slug) => exp({ slug, startYear: 2020, endYear: 2020 })),
        exp({ slug: 'g', startYear: 2020, endYear: 2021 }),
      ],
      2026,
      z0,
    )
    expect(t.lanes).toBe(7)
    const g = t.segments.find((s) => s.experience === 'g')!
    expect(g.lane).toBe(6)
    expectOctilinear(g.points)
    expect(g.points.at(-1)![1]).toBeCloseTo(z0)
    // Limite connue : à sept voies la descente ne tient pas dans le poste et peut
    // couper une voie intermédiaire ; l'octilinéarité, elle, est préservée.
  })
})
