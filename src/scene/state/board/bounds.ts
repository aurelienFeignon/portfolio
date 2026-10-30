/**
 * Les bornes de la carte mère : où commence le bus, et jusqu'où s'étend la
 * carte (donc la grille du routeur).
 *
 * Repère : X vers la droite, Z vers le visiteur. Le bus court **devant**
 * (Z positifs) : il part derrière ce qui avance le plus vers le visiteur.
 *
 * Module pur : ni `Date`, ni `Math.random`, ni Three.js.
 */
import { EMPTY_RECT, inflate, type Rect, rectUnion } from './rect.ts'
import type { Zone } from './zones.ts'

/** Marge autour de tout ce que porte la carte : les pistes contournent par là. */
export const BOARD_MARGIN = 1.5
/** Écart entre le bord avant du quartier (ou d'une zone) et la voie 0 du bus. */
const BUS_CLEARANCE = 2

/**
 * L'origine en Z du bus : `BUS_CLEARANCE` devant le plus grand `maxZ` du
 * quartier et des zones — le bus ne passe jamais sous une puce ni sous un
 * processeur, et les rattachements disposent d'un couloir pour le rejoindre.
 */
export function timelineOriginZ(district: Rect, zones: readonly Zone[]): number {
  return Math.max(district.maxZ, ...zones.map((z) => z.bounds.maxZ)) + BUS_CLEARANCE
}

/**
 * La carte : l'union des rectangles, élargie de `BOARD_MARGIN` de chaque côté.
 * Sans rectangle, un carré de côté 4 centré sur l'origine (jamais une carte
 * dégénérée).
 */
export function boardBounds(rects: readonly Rect[]): Rect {
  const union = rectUnion(rects)
  return union === null ? EMPTY_RECT : inflate(union, BOARD_MARGIN)
}
