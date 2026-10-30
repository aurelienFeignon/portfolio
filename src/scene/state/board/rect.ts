/**
 * Les rectangles de la carte mère — la carte est à plat dans le plan XZ, le
 * module travaille donc en 2D : `[x, z]`, X vers la droite, Z vers le visiteur.
 */

export type Vec2 = readonly [x: number, z: number]

/**
 * Tolérance flottante de toute la géométrie de la carte, à l'échelle d'une
 * carte en unités de scène : un bord posé sur une ligne de grille ne déborde
 * pas sur la voisine, deux rectangles à l'écart exact ne se recouvrent pas.
 */
export const EPSILON = 1e-9

/** Pas de la grille du routeur (et des reculs de zone, des petits composants). */
export const GRID = 0.25

/** Écart entre le bord arrière d'un boîtier ou d'une zone et son ancre d'étiquette. */
export const LABEL_MARGIN = 0.3

export interface Rect {
  readonly minX: number
  readonly minZ: number
  readonly maxX: number
  readonly maxZ: number
}

/** Le rectangle de largeur `w` (X) et de profondeur `d` (Z) centré sur `center`. */
export function rectOf(center: Vec2, w: number, d: number): Rect {
  return {
    minX: center[0] - w / 2,
    minZ: center[1] - d / 2,
    maxX: center[0] + w / 2,
    maxZ: center[1] + d / 2,
  }
}

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

/** Le rectangle élargi de `by` de chaque côté (rétréci si `by` est négatif). */
export function inflate(rect: Rect, by: number): Rect {
  return {
    minX: rect.minX - by,
    minZ: rect.minZ - by,
    maxX: rect.maxX + by,
    maxZ: rect.maxZ + by,
  }
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

export function rectCenter(rect: Rect): Vec2 {
  return [(rect.minX + rect.maxX) / 2, (rect.minZ + rect.maxZ) / 2]
}
