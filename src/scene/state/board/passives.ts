/**
 * Les petits composants de la carte mère : résistances et condensateurs semés
 * sur les cellules que ni les puces, ni les processeurs, ni les pistes n'ont
 * prises. Ils ne portent aucun sens — ils font la carte. Leur budget par
 * palier est `BOARD_DENSITY` (`layout.ts`), que la scène lit aussi.
 *
 * Repère : celui de `grid.ts` (X vers la droite, Z vers le visiteur).
 *
 * Module pur : ni `Date`, ni `Math.random` (la graine est un paramètre), ni
 * Three.js.
 */
import { seededRandom } from '../seeded-random.ts'
import type { Cell, RoutingGrid } from './grid.ts'
import { rectsOverlap } from './rect.ts'
import { GRID, type Rect, rectOf, type Vec2 } from '../plane.ts'

export interface Passive {
  readonly kind: 'resistor' | 'capacitor'
  /** `R1…` pour les résistances, `C1…` pour les condensateurs, dans l'ordre de pose. */
  readonly ref: string
  readonly center: Vec2
  /** Vrai : 1 colonne × 2 rangées au lieu de 2 × 1. */
  readonly rotated: boolean
}

/** Emprise d'un petit composant : 2 × 1 cellules (1 × 2 s'il est tourné). */
const LONG = 2

/**
 * L'emplacement réservé à une étiquette, centré sur son ancre : largeur (X) et
 * profondeur (Z). Les ancres des processeurs et des zones tombent juste
 * derrière leur bord arrière, sur des cellules que rien ne bloque — sans
 * réserve, un petit composant s'y posait sous le texte.
 */
const LABEL_KEEP_OUT = { width: 2, depth: 0.6 } as const

/** Le rectangle que les petits composants laissent libre autour d'une ancre d'étiquette. */
const labelKeepOut = (anchor: Vec2): Rect =>
  rectOf(anchor, LABEL_KEEP_OUT.width, LABEL_KEEP_OUT.depth)

/** Mélange de Fisher-Yates, déterministe pour une graine donnée. */
function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}

/**
 * Sème au plus `count` petits composants sur les cellules libres de `grid`,
 * chacun avec une cellule de dégagement (l'emprise et ses huit voisines
 * doivent être libres), sans que deux composants se touchent, et sans que
 * l'emprise entame l'emplacement réservé (`LABEL_KEEP_OUT`) autour de l'une
 * des `labelAnchors`.
 *
 * La grille n'est pas modifiée : les cellules prises sont suivies localement.
 * Même graine, même grille → même sortie.
 */
export function scatterPassives(
  grid: RoutingGrid,
  count: number,
  seed: number,
  labelAnchors: readonly Vec2[] = [],
): readonly Passive[] {
  if (count <= 0) return []
  const keepOut = labelAnchors.map(labelKeepOut)
  const random = seededRandom(seed)
  const anchors: Cell[] = []
  for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) anchors.push([c, r])
  shuffle(anchors, random)

  const taken = new Set<number>()
  const key = (c: number, r: number): number => r * grid.cols + c
  const out: Passive[] = []
  let resistors = 0
  let capacitors = 0

  for (const [c, r] of anchors) {
    if (out.length >= count) break
    const rotated = random() < 0.5
    const w = rotated ? 1 : LONG
    const h = rotated ? LONG : 1
    let fits = true
    // Emprise + une cellule tout autour : libre sur la grille, et hors des composants déjà posés.
    for (let dc = -1; dc <= w && fits; dc++)
      for (let dr = -1; dr <= h && fits; dr++) {
        const cc = c + dc
        const rr = r + dr
        fits = grid.isFree([cc, rr]) && !taken.has(key(cc, rr))
      }
    if (!fits) continue
    const origin = grid.toPoint([c, r])
    const center: Vec2 = [origin[0] + ((w - 1) * GRID) / 2, origin[1] + ((h - 1) * GRID) / 2]
    const box = rectOf(center, w * GRID, h * GRID)
    if (keepOut.some((k) => rectsOverlap(box, k))) continue
    for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < h; dr++) taken.add(key(c + dc, r + dr))
    const kind = random() < 0.5 ? 'resistor' : 'capacitor'
    const ref = kind === 'resistor' ? `R${++resistors}` : `C${++capacitors}`
    out.push({ kind, ref, center, rotated })
  }
  return out
}
