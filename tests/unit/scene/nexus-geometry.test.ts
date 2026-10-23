/**
 * D11 — les formes procédurales de NEXUS : déterministes, et conformes à ce
 * qu'elles annoncent.
 */
import { describe, expect, it } from 'vitest'

import {
  arc,
  constellation,
  helix,
  isoArchitecture,
  nearestEdges,
  particleShell,
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

describe('les arêtes aux plus proches voisins', () => {
  it('n’a ni doublon, ni boucle, et chaque arête est ordonnée', () => {
    const { points } = constellation(2, 7, 7)
    const edges = nearestEdges(points, 3)
    const cles = edges.map(([a, b]) => `${a}-${b}`)
    expect(new Set(cles).size).toBe(cles.length)
    for (const [a, b] of edges) expect(a).toBeLessThan(b)
  })

  it('relie chaque point à au moins un autre', () => {
    const { points } = constellation(2, 5, 2)
    const relies = new Set(nearestEdges(points, 2).flat())
    expect(relies.size).toBe(10)
  })
})

describe('la constellation', () => {
  it('rend `amas × points` points, chacun rattaché à son amas', () => {
    const { points, cluster, centers } = constellation(5, 12, 11)
    expect(points).toHaveLength(60)
    expect(cluster).toHaveLength(60)
    expect(centers).toHaveLength(5)
    expect(new Set(cluster)).toEqual(new Set([0, 1, 2, 3, 4]))
  })
})

describe('l’hélice et l’arc', () => {
  it('l’hélice va de −h/2 à +h/2, au rayon constant', () => {
    const points = helix(2, 4, 0.5, 40)
    expect(points).toHaveLength(41)
    expect(points[0]![1]).toBeCloseTo(-2)
    expect(points[40]![1]).toBeCloseTo(2)
    for (const [x, , z] of points) expect(Math.hypot(x, z)).toBeCloseTo(0.5)
  })

  it('l’arc part de son origine, arrive à sa cible et se soulève à mi-course', () => {
    const points = arc([0, 0, 0], [4, 0, 0], 2, 10)
    expect(points[0]).toEqual([0, 0, 0])
    expect(points[10]).toEqual([4, 0, 0])
    expect(points[5]![1]).toBeCloseTo(1)
  })
})

describe('l’architecture isométrique', () => {
  const { slabs, blocks, links } = isoArchitecture(3, 12, 5)

  it('empile des plateaux qui rétrécissent en montant', () => {
    expect(slabs).toHaveLength(3)
    for (let i = 1; i < slabs.length; i += 1) {
      expect(slabs[i]!.y).toBeGreaterThan(slabs[i - 1]!.y)
      expect(slabs[i]!.size).toBeLessThan(slabs[i - 1]!.size)
    }
  })

  it('pose chaque bloc sur un plateau, à l’intérieur de ses bords', () => {
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks.length).toBeLessThanOrEqual(12)
    for (const [x, y, z] of blocks) {
      const slab = slabs.find((candidate) => Math.abs(candidate.y + 0.18 - y) < 1e-9)
      expect(slab).toBeDefined()
      expect(Math.abs(x)).toBeLessThan(slab!.size / 2)
      expect(Math.abs(z)).toBeLessThan(slab!.size / 2)
    }
  })

  it('trace des liaisons en équerre — chaque segment suit un seul axe', () => {
    expect(links.length).toBeGreaterThan(0)
    for (const [a, b] of links) {
      const axes = [0, 1, 2].filter((i) => Math.abs(a[i]! - b[i]!) > 1e-9)
      expect(axes.length).toBeLessThanOrEqual(1)
    }
  })

  it('est déterministe', () => {
    expect(isoArchitecture(3, 12, 5)).toEqual(isoArchitecture(3, 12, 5))
  })
})
