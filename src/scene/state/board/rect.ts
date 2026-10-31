/**
 * Les rectangles de la carte mère — la carte est à plat dans le plan XZ, le
 * module travaille donc en 2D : `[x, z]`, X vers la droite, Z vers le visiteur.
 *
 * Les primitives que la scène partage (`Vec2`, `Rect`, `rectOf`, `inflate`, `rectCenter`,
 * `EPSILON`, `GRID`) vivent dans le module neutre `../plane.ts` ; ne restent ici que celles
 * propres au plan de la carte.
 */
import { type Rect, rectOf } from '../plane.ts'

/** Écart entre le bord arrière d'un boîtier ou d'une zone et son ancre d'étiquette. */
export const LABEL_MARGIN = 0.3

/**
 * Ce qui tient lieu de rectangle quand il n'y a rien à englober (carte ou
 * quartier vides) : un carré de côté 4 centré sur l'origine, jamais un
 * rectangle dégénéré.
 */
export const EMPTY_RECT: Rect = rectOf([0, 0], 4, 4)

/** Le plus petit rectangle qui les contient tous ; `null` pour une liste vide. */
export function rectUnion(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null
  return rects.reduce((acc, r) => ({
    minX: Math.min(acc.minX, r.minX),
    minZ: Math.min(acc.minZ, r.minZ),
    maxX: Math.max(acc.maxX, r.maxX),
    maxZ: Math.max(acc.maxZ, r.maxZ),
  }))
}

/**
 * Vrai si l'écart entre les deux rectangles est **strictement** inférieur à `gap`.
 * Deux rectangles qui se touchent exactement à `gap` ne se recouvrent pas.
 */
export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return (
    a.minX - b.maxX < gap && b.minX - a.maxX < gap && a.minZ - b.maxZ < gap && b.minZ - a.maxZ < gap
  )
}
