/**
 * D11 — les formes procédurales de NEXUS : déterministes, et conformes à ce
 * qu'elles annoncent.
 */
import { describe, expect, it } from 'vitest'

import {
  arc,
  particleShell,
  plateStack,
  polylineLength,
  seededRandom,
} from '@/scene/state/nexus-geometry'

describe('le générateur à graine', () => {
  it('rend la même suite pour la même graine, une autre pour une autre', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const c = seededRandom(43)
    const suiteA = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(suiteA)
    expect([c(), c(), c()]).not.toEqual(suiteA)
  })

  it('reste dans [0, 1)', () => {
    const random = seededRandom(1)
    for (let i = 0; i < 1000; i += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('la coquille de particules', () => {
  it('place chaque point entre les deux rayons (Y aplati compris)', () => {
    const { positions, phases } = particleShell(400, 4, 20, 3)
    expect(positions).toHaveLength(1200)
    expect(phases).toHaveLength(400)
    for (let i = 0; i < 400; i += 1) {
      const x = positions[i * 3]!
      const y = positions[i * 3 + 1]! / 0.66
      const z = positions[i * 3 + 2]!
      const r = Math.hypot(x, y, z)
      expect(r).toBeGreaterThanOrEqual(4 - 1e-6)
      expect(r).toBeLessThanOrEqual(20 + 1e-6)
    }
  })

  it('est déterministe', () => {
    expect(particleShell(50, 1, 2, 9).positions).toEqual(particleShell(50, 1, 2, 9).positions)
  })
})

describe('l’arc et sa longueur', () => {
  it('l’arc part de son origine, arrive à sa cible et se soulève à mi-course', () => {
    const points = arc([0, 0, 0], [4, 0, 0], 2, 10)
    expect(points[0]).toEqual([0, 0, 0])
    expect(points[10]).toEqual([4, 0, 0])
    expect(points[5]![1]).toBeCloseTo(1)
  })

  it('la longueur d’une polyligne est la somme de ses segments', () => {
    expect(
      polylineLength([
        [0, 0, 0],
        [3, 0, 0],
        [3, 4, 0],
      ]),
    ).toBe(7)
    expect(polylineLength([[1, 2, 3]])).toBe(0)
  })

  it('un arc soulevé est plus long que la corde, jamais plus court', () => {
    const corde = 4
    expect(polylineLength(arc([0, 0, 0], [4, 0, 0], 2, 64))).toBeGreaterThan(corde)
    expect(polylineLength(arc([0, 0, 0], [4, 0, 0], 0, 64))).toBeCloseTo(corde)
  })
})

describe('la pile de plateaux', () => {
  const pile = plateStack(3, 1.8, 0.35, 0.75)

  it('empile des plateaux qui rétrécissent en montant, sans s’annuler', () => {
    expect(pile).toHaveLength(3)
    for (let i = 1; i < pile.length; i += 1) {
      expect(pile[i]!.y).toBeGreaterThan(pile[i - 1]!.y)
      expect(pile[i]!.size).toBeLessThan(pile[i - 1]!.size)
    }
    expect(pile[pile.length - 1]!.size).toBeGreaterThan(0)
  })

  it('est centrée sur l’origine : l’univers pivote autour de son milieu', () => {
    expect(pile[0]!.y + pile[2]!.y).toBeCloseTo(0)
    expect(pile[1]!.y).toBeCloseTo(0)
  })
})
