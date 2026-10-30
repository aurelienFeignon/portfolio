/**
 * Le générateur à graine de la carte mère (sorti de la géométrie de NEXUS, D11, retirée en P8-15h).
 *
 * ⭐ Un `Math.random()` ferait de chaque chargement une autre scène : avec une
 * graine fixe, deux visites voient la même forme, un banc peut affirmer une
 * propriété sur une sortie connue.
 */

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
