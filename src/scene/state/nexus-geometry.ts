/**
 * Les formes procédurales de NEXUS, en nombres purs — aucun import de three.
 *
 * ⭐ **Tout est tiré d'un générateur à graine fixe.** Deux visites voient la même
 * constellation, un banc peut affirmer une propriété sur une sortie connue, et
 * une capture d'écran se compare à la précédente. Un `Math.random()` aurait fait
 * de chaque chargement une autre scène.
 */
import type { Vec3 } from './layout.ts'

/** mulberry32 — 32 bits d'état, assez pour une scène, sans dépendance. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Des particules réparties dans une coquille épaisse autour de l'origine.
 *
 * ⛔ Le rayon est tiré en **racine cubique** : un tirage uniforme sur le rayon
 * entasserait les points au centre, là où la scène est déjà la plus dense.
 */
export function particleShell(
  count: number,
  inner: number,
  outer: number,
  seed: number,
): { readonly positions: Float32Array; readonly phases: Float32Array } {
  const random = seededRandom(seed)
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const inner3 = inner ** 3
  const outer3 = outer ** 3

  for (let i = 0; i < count; i += 1) {
    const radius = Math.cbrt(inner3 + random() * (outer3 - inner3))
    const theta = random() * Math.PI * 2
    const cosPhi = random() * 2 - 1
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi)
    // Aplatie d'un tiers en Y : une galaxie plutôt qu'une boule.
    positions[i * 3] = radius * sinPhi * Math.cos(theta)
    positions[i * 3 + 1] = radius * cosPhi * 0.66
    positions[i * 3 + 2] = radius * sinPhi * Math.sin(theta)
    phases[i] = random() * Math.PI * 2
  }

  return { positions, phases }
}

/**
 * Un arc entre deux points, soulevé à mi-course — une courbe de Bézier
 * quadratique échantillonnée.
 */
export function arc(from: Vec3, to: Vec3, lift: number, segments: number): Vec3[] {
  const control: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + lift, (from[2] + to[2]) / 2]
  const points: Vec3[] = []
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const a = (1 - t) * (1 - t)
    const b = 2 * (1 - t) * t
    const c = t * t
    points.push([
      a * from[0] + b * control[0] + c * to[0],
      a * from[1] + b * control[1] + c * to[1],
      a * from[2] + b * control[2] + c * to[2],
    ])
  }
  return points
}

/** La longueur d'une polyligne — ce qui règle le pas des pointillés d'un faisceau. */
export function polylineLength(points: readonly Vec3[]): number {
  let length = 0
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Vec3
    const b = points[i] as Vec3
    length += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  }
  return length
}

/**
 * Expériences — des plateaux carrés empilés, du plus large (bas) au plus étroit
 * (haut), centrés sur l'origine : une architecture en couches.
 */
export function plateStack(
  levels: number,
  base: number,
  shrink: number,
  step: number,
): ReadonlyArray<{ readonly y: number; readonly size: number }> {
  return Array.from({ length: levels }, (_, i) => ({
    y: (i - (levels - 1) / 2) * step,
    size: base - i * shrink,
  }))
}
