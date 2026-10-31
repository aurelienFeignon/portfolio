/**
 * Assertions géométriques partagées par les bancs de la carte mère.
 */
import { expect } from 'vitest'

import { EPSILON as EPS, type Rect, type Vec2 } from '@/scene/state/plane'

/**
 * Le point `p` est-il dans `rect` ? `margin` élargit le rectangle de chaque
 * côté (rétrécit s'il est négatif) ; `strict` exclut les bords, que le défaut
 * inclut.
 */
export function rectContains(
  rect: Rect,
  [x, z]: Vec2,
  { margin = 0, strict = false }: { margin?: number; strict?: boolean } = {},
): boolean {
  const le = (a: number, b: number) => (strict ? a < b : a <= b)
  return (
    le(rect.minX - margin, x) &&
    le(x, rect.maxX + margin) &&
    le(rect.minZ - margin, z) &&
    le(z, rect.maxZ + margin)
  )
}

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

/** Le point `p`, colinéaire à `[a, b]`, est-il sur ce segment (bornes comprises) ? */
const within = (a: Vec2, b: Vec2, p: Vec2): boolean =>
  p[0] >= Math.min(a[0], b[0]) - EPS &&
  p[0] <= Math.max(a[0], b[0]) + EPS &&
  p[1] >= Math.min(a[1], b[1]) - EPS &&
  p[1] <= Math.max(a[1], b[1]) + EPS

/** Les segments `[p1,p2]` et `[q1,q2]` ont-ils un point commun **sans** se traverser ? */
function segmentsTouch(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2): boolean {
  return (
    (Math.abs(cross(q1, q2, p1)) < EPS && within(q1, q2, p1)) ||
    (Math.abs(cross(q1, q2, p2)) < EPS && within(q1, q2, p2)) ||
    (Math.abs(cross(p1, p2, q1)) < EPS && within(p1, p2, q1)) ||
    (Math.abs(cross(p1, p2, q2)) < EPS && within(p1, p2, q2))
  )
}

/** Le point où deux segments qui se traversent se coupent. */
function crossingPoint(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2): Vec2 {
  const t = cross(q1, q2, p1) / (cross(q1, q2, p1) - cross(q1, q2, p2))
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])]
}

/** Un pont déclaré : `net` franchit `crosses` en `at`. */
export interface DeclaredVia {
  readonly at: Vec2
  readonly net: string
  readonly crosses: string
}

/**
 * Aucune paire de polylignes ne se traverse. Un croisement est une
 * intersection **propre** (les deux segments se coupent en un point intérieur
 * à chacun) : se toucher par une extrémité (une voie qui part d'une autre),
 * ou se superposer sur une voie commune (colinéaires), n'en est pas un.
 *
 * `groupOf(i)` donne le groupe de la polyligne `i` (par exemple le `net` d'une
 * route) : les paires d'un même groupe sont exclues.
 *
 * `strict` (pistes de réseaux différents) : **tout** point commun est refusé —
 * T, contact par les extrémités, superposition colinéaire — et un croisement
 * propre n'est admis qu'en un pont de `vias` déclaré entre ces deux groupes.
 */
export function expectNoCrossing(
  polylines: readonly (readonly Vec2[])[],
  groupOf?: (index: number) => string | number,
  options: { strict?: boolean; vias?: readonly DeclaredVia[] } = {},
): void {
  const { strict = false, vias = [] } = options
  const declared = (p: Vec2, a: string | number, b: string | number) =>
    vias.some(
      (v) =>
        Math.abs(v.at[0] - p[0]) < 1e-6 &&
        Math.abs(v.at[1] - p[1]) < 1e-6 &&
        ((v.net === a && v.crosses === b) || (v.net === b && v.crosses === a)),
    )
  // Boîtes englobantes : seules les paires qui peuvent se toucher sont examinées,
  // et `expect` n'est appelé que sur une faute (il coûte cher par paire).
  const boxOf = (points: readonly Vec2[]) => ({
    minX: Math.min(...points.map((p) => p[0])) - EPS,
    maxX: Math.max(...points.map((p) => p[0])) + EPS,
    minZ: Math.min(...points.map((p) => p[1])) - EPS,
    maxZ: Math.max(...points.map((p) => p[1])) + EPS,
  })
  const boxes = polylines.map(boxOf)
  const apart = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) =>
    a.maxX < b.minX || b.maxX < a.minX || a.maxZ < b.minZ || b.maxZ < a.minZ
  for (let i = 0; i < polylines.length; i += 1) {
    for (let j = i + 1; j < polylines.length; j += 1) {
      const gi = groupOf ? groupOf(i) : i
      const gj = groupOf ? groupOf(j) : j
      if ((groupOf && gi === gj) || apart(boxes[i]!, boxes[j]!)) continue
      const a = polylines[i]!
      const b = polylines[j]!
      for (let s = 1; s < a.length; s += 1) {
        for (let t = 1; t < b.length; t += 1) {
          const [p1, p2, q1, q2] = [a[s - 1]!, a[s]!, b[t - 1]!, b[t]!]
          if (apart(boxOf([p1, p2]), boxOf([q1, q2]))) continue
          const where = `polylignes ${i} (segment ${s - 1}) et ${j} (segment ${t - 1})`
          if (segmentsCross(p1, p2, q1, q2)) {
            if (!(strict && declared(crossingPoint(p1, p2, q1, q2), gi, gj)))
              expect.fail(`${where} se croisent`)
          } else if (strict && segmentsTouch(p1, p2, q1, q2)) {
            expect.fail(`${where} se touchent`)
          }
        }
      }
    }
  }
}

/** Le point `p` est sur un segment de la polyligne, à `EPS` près. */
export function onPolyline(p: Vec2, points: readonly Vec2[], eps = EPS): boolean {
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1]!, points[i]!]
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    const inBox =
      p[0] >= Math.min(a[0], b[0]) - eps &&
      p[0] <= Math.max(a[0], b[0]) + eps &&
      p[1] >= Math.min(a[1], b[1]) - eps &&
      p[1] <= Math.max(a[1], b[1]) + eps
    if (Math.abs(cross) <= eps * Math.max(1, length) && inBox) return true
  }
  return false
}

/**
 * Aucun demi-tour sur place : deux segments consécutifs ne sont jamais
 * antiparallèles (une pointe de largeur nulle, invisible au tracé mais que le
 * survol allumerait).
 */
export function expectNoReversal(points: readonly Vec2[]): void {
  for (let i = 2; i < points.length; i += 1) {
    const [a, b, c] = [points[i - 2]!, points[i - 1]!, points[i]!]
    const u: Vec2 = [b[0] - a[0], b[1] - a[1]]
    const v: Vec2 = [c[0] - b[0], c[1] - b[1]]
    const cross = u[0] * v[1] - u[1] * v[0]
    const dot = u[0] * v[0] + u[1] * v[1]
    expect(
      Math.abs(cross) < EPS && dot < 0,
      `demi-tour en ${b[0]}, ${b[1]} (sommet ${i - 1})`,
    ).toBe(false)
  }
}
