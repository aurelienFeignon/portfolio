/**
 * Assertions géométriques partagées par les bancs de la carte mère.
 */
import { expect } from 'vitest'

import type { Vec2 } from '@/scene/state/board/rect'

const EPS = 1e-9

/**
 * Chaque segment de la polyligne est horizontal, vertical ou à 45°, et aucun
 * n'est nul (un point dupliqué cacherait un coude dégénéré).
 */
export function expectOctilinear(points: readonly Vec2[]): void {
  expect(points.length).toBeGreaterThanOrEqual(2)
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i]![0] - points[i - 1]![0]
    const dz = points[i]![1] - points[i - 1]![1]
    const length = Math.hypot(dx, dz)
    const octilinear =
      Math.abs(dx) < EPS || Math.abs(dz) < EPS || Math.abs(Math.abs(dx) - Math.abs(dz)) < EPS
    expect(length > EPS && octilinear, `segment ${i - 1}→${i} : dx=${dx}, dz=${dz}`).toBe(true)
  }
}

const cross = (o: Vec2, a: Vec2, b: Vec2): number =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

/** Vrai si les segments `[p1,p2]` et `[q1,q2]` se **traversent** strictement. */
function segmentsCross(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2): boolean {
  const d1 = cross(q1, q2, p1)
  const d2 = cross(q1, q2, p2)
  const d3 = cross(p1, p2, q1)
  const d4 = cross(p1, p2, q2)
  return d1 * d2 < -EPS && d3 * d4 < -EPS
}

/**
 * Aucune paire de polylignes ne se traverse. Un croisement est une
 * intersection **propre** (les deux segments se coupent en un point intérieur
 * à chacun) : se toucher par une extrémité (une voie qui part d'une autre),
 * ou se superposer sur une voie commune (colinéaires), n'en est pas un.
 *
 * `groupOf(i)` donne le groupe de la polyligne `i` (par exemple le `net` d'une
 * route) : les paires d'un même groupe sont exclues.
 */
export function expectNoCrossing(
  polylines: readonly (readonly Vec2[])[],
  groupOf?: (index: number) => string | number,
): void {
  for (let i = 0; i < polylines.length; i += 1) {
    for (let j = i + 1; j < polylines.length; j += 1) {
      if (groupOf && groupOf(i) === groupOf(j)) continue
      const a = polylines[i]!
      const b = polylines[j]!
      for (let s = 1; s < a.length; s += 1) {
        for (let t = 1; t < b.length; t += 1) {
          expect(
            segmentsCross(a[s - 1]!, a[s]!, b[t - 1]!, b[t]!),
            `polylignes ${i} (segment ${s - 1}) et ${j} (segment ${t - 1}) se croisent`,
          ).toBe(false)
        }
      }
    }
  }
}
