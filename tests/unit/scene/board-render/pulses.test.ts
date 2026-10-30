import { describe, expect, it } from 'vitest'
import { makeBoardContent, makeRealSizeBoard } from '../../../fixtures/builders/board'
import { buildBoardFile } from '@/scene/state/board/file'
import {
  PULSE_SPEED,
  pulseFrame,
  pulsePaths,
  type PulsePath,
} from '@/scene/state/board-render/pulses'
import type { Vec2 } from '@/scene/state/board/rect'

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

const line = (points: Vec2[], kind: 'bus' | 'link' = 'link'): PulsePath => ({
  kind,
  points,
  length: points
    .slice(1)
    .reduce((s, p, i) => s + Math.hypot(p[0] - points[i]![0], p[1] - points[i]![1]), 0),
})

/** Distance d'un point à une polyligne. */
function distanceTo(path: PulsePath, x: number, z: number): number {
  let best = Infinity
  for (let i = 1; i < path.points.length; i++) {
    const [ax, az] = path.points[i - 1]!
    const [bx, bz] = path.points[i]!
    const dx = bx - ax
    const dz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)))
  }
  return best
}

describe('pulsePaths', () => {
  for (const [name, file] of [
    ['réel', real],
    ['petit', small],
  ] as const) {
    it(`${name} : un chemin de bus et des pistes de longueur positive`, () => {
      const paths = pulsePaths(file)
      expect(paths.filter((p) => p.kind === 'bus')).toHaveLength(1)
      expect(paths.filter((p) => p.kind === 'link').length).toBeGreaterThan(0)
      for (const p of paths) {
        expect(p.length).toBeGreaterThan(0)
        expect(p.points.length).toBeGreaterThan(1)
      }
    })
  }

  it('le bus suit le sens du temps : de la première à la dernière année (la colonne vertébrale)', () => {
    const bus = pulsePaths(real).find((p) => p.kind === 'bus')!
    expect(bus.points).toEqual(real.plan.timeline.spine)
  })

  it('chaque piste finit au plus près d’un processeur (orientée vers lui)', () => {
    const procs = real.plan.district.processors
    const dist = (pt: Vec2) =>
      Math.min(
        ...procs.map((p) => {
          const h = p.size / 2
          return Math.hypot(
            Math.max(Math.abs(pt[0] - p.center[0]) - h, 0),
            Math.max(Math.abs(pt[1] - p.center[1]) - h, 0),
          )
        }),
      )
    for (const p of pulsePaths(real).filter((q) => q.kind === 'link')) {
      expect(dist(p.points.at(-1)!)).toBeLessThanOrEqual(dist(p.points[0]!) + 1e-9)
    }
  })

  it('ignore les pistes dégénérées et un bus sans tracé', () => {
    const file = structuredClone(small)
    const p: Vec2 = [1, 1]
    ;(file.plan.timeline as { spine: unknown }).spine = [p]
    ;(file.plan.traces as { routes: unknown }).routes = [
      { net: 'a', kind: 'link', links: [], points: [p] },
      { net: 'b', kind: 'link', links: [], points: [p, p] },
    ]
    expect(pulsePaths(file)).toEqual([])
  })

  it('renverse une piste dont le début touche le processeur', () => {
    const file = structuredClone(small)
    const proc = file.plan.district.processors[0]!
    const far: Vec2 = [proc.center[0] + 500, proc.center[1]]
    const near: Vec2 = [proc.center[0] + proc.size / 2, proc.center[1]]
    ;(file.plan.traces as { routes: unknown }).routes = [
      { net: 'a', kind: 'link', links: [], points: [near, far] },
      { net: 'b', kind: 'link', links: [], points: [far, near] },
    ]
    const links = pulsePaths(file).filter((p) => p.kind === 'link')
    expect(links[0]!.points).toEqual([far, near])
    expect(links[1]!.points).toEqual([far, near])
  })
})

describe('pulseFrame', () => {
  const paths = [
    line(
      [
        [0, 0],
        [10, 0],
      ],
      'bus',
    ),
    line([
      [0, 5],
      [0, 8],
      [4, 8],
    ]),
  ]

  it('rend [x, z] par impulsion, et chacune est sur son chemin', () => {
    const out = pulseFrame(paths, 12, 3.7)
    expect(out).toHaveLength(24)
    for (let i = 0; i < 12; i++) {
      const x = out[i * 2]!
      const z = out[i * 2 + 1]!
      const d = Math.min(distanceTo(paths[0]!, x, z), distanceTo(paths[1]!, x, z))
      expect(d).toBeLessThan(1e-4)
    }
  })

  it('répartit proportionnellement à la longueur, sans aléa', () => {
    const a = pulseFrame(paths, 13, 1)
    const b = pulseFrame(paths, 13, 1)
    expect([...a]).toEqual([...b])
    // 10 / 17 de 13 ≈ 7,6 → 8 sur le premier chemin (plus fort reste), 5 sur le second.
    let onFirst = 0
    for (let i = 0; i < 13; i++) if (Math.abs(a[i * 2 + 1]!) < 1e-6) onFirst++
    expect(onFirst).toBe(8)
  })

  it('avance dans le sens du chemin, à PULSE_SPEED', () => {
    const solo = [
      line([
        [0, 0],
        [100, 0],
      ]),
    ]
    const a = pulseFrame(solo, 1, 0)
    const b = pulseFrame(solo, 1, 0.5)
    expect(b[0]! - a[0]!).toBeCloseTo(0.5 * PULSE_SPEED, 4)
  })

  it('boucle : pulseFrame(t) = pulseFrame(t + période)', () => {
    const solo = [
      line([
        [0, 0],
        [10, 0],
        [10, 6],
      ]),
    ]
    const period = solo[0]!.length / PULSE_SPEED
    const a = pulseFrame(solo, 4, 1.3)
    const b = pulseFrame(solo, 4, 1.3 + period)
    for (let i = 0; i < a.length; i++) expect(b[i]!).toBeCloseTo(a[i]!, 3)
  })

  it('temps constant ⇒ positions constantes', () => {
    const a = [...pulseFrame(paths, 9, 2.4)]
    const b = [...pulseFrame(paths, 9, 2.4)]
    expect(a).toEqual(b)
  })

  it('répartit les impulsions d’un chemin à égale distance', () => {
    const solo = [
      line([
        [0, 0],
        [8, 0],
      ]),
    ]
    const out = pulseFrame(solo, 4, 0)
    expect([...out].filter((_, i) => i % 2 === 0).sort((x, y) => x - y)).toEqual([0, 2, 4, 6])
  })

  it('écrit dans le tampon fourni sans en allouer un autre', () => {
    const buffer = new Float32Array(8)
    expect(pulseFrame(paths, 4, 1, buffer)).toBe(buffer)
  })

  it('un temps négatif reste sur le chemin', () => {
    const out = pulseFrame(paths, 3, -5.5)
    for (let i = 0; i < 3; i++) {
      expect(
        Math.min(
          distanceTo(paths[0]!, out[i * 2]!, out[i * 2 + 1]!),
          distanceTo(paths[1]!, out[i * 2]!, out[i * 2 + 1]!),
        ),
      ).toBeLessThan(1e-4)
    }
  })

  it('aucun chemin ou zéro impulsion : tampon vide', () => {
    expect(pulseFrame([], 5, 1)).toHaveLength(0)
    expect(pulseFrame(paths, 0, 1)).toHaveLength(0)
  })

  it('plus d’impulsions que de chemins : un chemin peut en porter plusieurs', () => {
    expect(pulseFrame(paths, 30, 0)).toHaveLength(60)
  })
})
