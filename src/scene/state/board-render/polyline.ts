/**
 * Les polylignes de la carte mère (P8-15) : **une** définition du point répété, de la longueur
 * et de la distance à un tronçon, pour tout ce qui parcourt un tracé — rubans des pistes et du
 * bus (`geometry.ts`), impulsions (`pulses.ts`), lancer de rayon sur le bus (`relations.ts`).
 *
 * ⭐ Une seule tolérance de fusion : une impulsion court exactement sur le chemin que le ruban
 * dessine, parce que les deux ont fusionné les mêmes points.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import type { Vec2 } from '../plane.ts'

/**
 * Deux points du plan plus proches que ceci (par coordonnée) sont le même point, et un point plus
 * près d'un tronçon que ceci est dessus. À l'échelle d'une carte dont la grille vaut 0,25 : bien
 * au-dessus du bruit flottant, bien au-dessous de tout écart voulu.
 */
export const POINT_TOLERANCE = 1e-6

/**
 * Le carré de longueur en deçà duquel un tronçon est nul : la projection sur un sommet répété
 * (une marche) ne divise pas par zéro, et retombe sur ce sommet.
 */
const NULL_EDGE_LENGTH2 = 1e-12

export const samePoint = (a: Vec2, b: Vec2): boolean =>
  Math.abs(a[0] - b[0]) < POINT_TOLERANCE && Math.abs(a[1] - b[1]) < POINT_TOLERANCE

/** La polyligne sans ses points répétés consécutifs (à `POINT_TOLERANCE` près) ; un tableau neuf. */
export function dedupe(points: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = []
  for (const p of points) if (out.length === 0 || !samePoint(out.at(-1)!, p)) out.push(p)
  return out
}

/** La longueur du tronçon `a → b`. */
export const edgeLength = (a: Vec2, b: Vec2): number => Math.hypot(b[0] - a[0], b[1] - a[1])

/** La longueur de la polyligne, en unités de scène. */
export function polylineLength(points: readonly Vec2[]): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) sum += edgeLength(points[i - 1]!, points[i]!)
  return sum
}

/**
 * La distance du point `(x, z)` au segment `[a, b]`, extrémités comprises. Un segment nul rend la
 * distance à `a`. Coordonnées en nombres et non en `Vec2` : le lancer de rayon l'appelle à chaque
 * mouvement du pointeur, sans allouer.
 */
export function pointSegmentDistance(x: number, z: number, a: Vec2, b: Vec2): number {
  const [ax, az] = a
  const dx = b[0] - ax
  const dz = b[1] - az
  const length2 = dx * dx + dz * dz
  const t = Math.max(
    0,
    Math.min(1, ((x - ax) * dx + (z - az) * dz) / Math.max(length2, NULL_EDGE_LENGTH2)),
  )
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz))
}
