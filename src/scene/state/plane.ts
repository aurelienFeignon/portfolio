/**
 * Le plan de la carte mère, en 2D (P8-15) : la carte est à plat dans le plan XZ, d'où des
 * points `[x, z]` — X vers la droite, Z vers le visiteur — et des rectangles alignés sur les axes.
 *
 * ⭐ **Module neutre** : `board/` (le calcul du plan, au générateur) et `board-render/` (ce que la
 * scène en dessine) en importent tous deux les valeurs. Il vit hors des deux pour que la scène
 * n'ait jamais à tirer une valeur de `board/` (garde `check-scene-isolation.mts`).
 *
 * Module pur : n'importe rien.
 */

export type Vec2 = readonly [x: number, z: number]

export interface Rect {
  readonly minX: number
  readonly minZ: number
  readonly maxX: number
  readonly maxZ: number
}

/**
 * Tolérance flottante de toute la géométrie de la carte, à l'échelle d'une
 * carte en unités de scène : un bord posé sur une ligne de grille ne déborde
 * pas sur la voisine, deux rectangles à l'écart exact ne se recouvrent pas.
 */
export const EPSILON = 1e-9

/** Pas de la grille du routeur (et des reculs de zone, des petits composants, des pistes fines). */
export const GRID = 0.25

/** Le rectangle de largeur `w` (X) et de profondeur `d` (Z) centré sur `center`. */
export function rectOf(center: Vec2, w: number, d: number): Rect {
  return {
    minX: center[0] - w / 2,
    minZ: center[1] - d / 2,
    maxX: center[0] + w / 2,
    maxZ: center[1] + d / 2,
  }
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

export function rectCenter(rect: Rect): Vec2 {
  return [(rect.minX + rect.maxX) / 2, (rect.minZ + rect.maxZ) / 2]
}

/** Vrai si `point` est dans `rect`, bords compris. */
export function rectContains(rect: Rect, [x, z]: Vec2): boolean {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ
}
