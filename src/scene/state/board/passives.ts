/**
 * Les petits composants de la carte mère : résistances et condensateurs semés
 * sur les cellules que ni les puces, ni les processeurs, ni les pistes n'ont
 * prises. Ils ne portent aucun sens — ils font la carte — mais leur nombre se
 * compte ici, pas dans P8-15 : c'est le budget que la scène instanciera.
 *
 * Repère : celui de `grid.ts` (X vers la droite, Z vers le visiteur).
 *
 * Module pur : ni `Date`, ni `Math.random` (la graine est un paramètre), ni
 * Three.js.
 */
import type { DensityTier } from '../layout'
import { seededRandom } from '../seeded-random'
import { type Cell, GRID, type RoutingGrid } from './grid'
import type { Vec2 } from './rect'

/**
 * Le budget par palier : petits composants semés, impulsions animées sur les
 * pistes. `lite` ne sème rien ; la composition (zones, processeurs, routes) ne
 * change jamais d'un palier à l'autre, seulement ces deux nombres.
 */
export const BOARD_DENSITY: Readonly<Record<DensityTier, { passives: number; pulses: number }>> = {
  full: { passives: 120, pulses: 48 },
  reduced: { passives: 70, pulses: 32 },
  lite: { passives: 0, pulses: 16 },
}

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
 * doivent être libres), sans que deux composants se touchent.
 *
 * La grille n'est pas modifiée : les cellules prises sont suivies localement.
 * Même graine, même grille → même sortie.
 */
export function scatterPassives(
  grid: RoutingGrid,
  count: number,
  seed: number,
): readonly Passive[] {
  if (count <= 0) return []
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
    for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < h; dr++) taken.add(key(c + dc, r + dr))
    const kind = random() < 0.5 ? 'resistor' : 'capacitor'
    const ref = kind === 'resistor' ? `R${++resistors}` : `C${++capacitors}`
    const origin = grid.toPoint([c, r])
    out.push({
      kind,
      ref,
      center: [origin[0] + ((w - 1) * GRID) / 2, origin[1] + ((h - 1) * GRID) / 2],
      rotated,
    })
  }
  return out
}
