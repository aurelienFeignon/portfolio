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
 * Les arêtes qui relient chaque point à ses `k` plus proches voisins, sans
 * doublon : `[i, j]` avec `i < j`.
 */
export function nearestEdges(points: readonly Vec3[], k: number): Array<readonly [number, number]> {
  const seen = new Set<string>()
  const edges: Array<readonly [number, number]> = []

  points.forEach((point, i) => {
    const neighbours = points
      .map((other, j) => ({
        j,
        d: Math.hypot(other[0] - point[0], other[1] - point[1], other[2] - point[2]),
      }))
      .filter(({ j }) => j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, k)

    for (const { j } of neighbours) {
      const edge = i < j ? ([i, j] as const) : ([j, i] as const)
      const key = `${edge[0]}-${edge[1]}`
      if (!seen.has(key)) {
        seen.add(key)
        edges.push(edge)
      }
    }
  })

  return edges
}

/**
 * Une constellation : des amas de points autour de centres eux-mêmes répartis
 * sur un anneau incliné — un amas par domaine de compétences.
 */
export function constellation(
  clusters: number,
  perCluster: number,
  seed: number,
): { readonly points: Vec3[]; readonly cluster: number[]; readonly centers: Vec3[] } {
  const random = seededRandom(seed)
  const centers: Vec3[] = []
  const points: Vec3[] = []
  const cluster: number[] = []

  for (let c = 0; c < clusters; c += 1) {
    const angle = (c / clusters) * Math.PI * 2 + random() * 0.4
    const center: Vec3 = [
      Math.cos(angle) * 1.15,
      Math.sin(angle * 2) * 0.35,
      Math.sin(angle) * 1.15,
    ]
    centers.push(center)

    for (let p = 0; p < perCluster; p += 1) {
      // Gaussienne approchée : l'amas est dense au centre, épars au bord.
      const spread = 0.38 * Math.sqrt(-2 * Math.log(1 - random() * 0.999))
      const theta = random() * Math.PI * 2
      const phi = Math.acos(random() * 2 - 1)
      points.push([
        center[0] + spread * Math.sin(phi) * Math.cos(theta),
        center[1] + spread * Math.cos(phi) * 0.6,
        center[2] + spread * Math.sin(phi) * Math.sin(theta),
      ])
      cluster.push(c)
    }
  }

  return { points, cluster, centers }
}

/** Une hélice le long de l'axe Y, de `-height/2` à `+height/2`. */
export function helix(turns: number, height: number, radius: number, segments: number): Vec3[] {
  const points: Vec3[] = []
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const angle = t * turns * Math.PI * 2
    points.push([Math.cos(angle) * radius, (t - 0.5) * height, Math.sin(angle) * radius])
  }
  return points
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

/** Une architecture isométrique : plateaux, blocs posés dessus, liaisons. */
export interface Architecture {
  /** Un plateau carré par niveau, du plus large (bas) au plus étroit (haut). */
  readonly slabs: ReadonlyArray<{ readonly y: number; readonly size: number }>
  /** Le centre de chaque bloc, posé sur son plateau. */
  readonly blocks: Vec3[]
  /** Les flux de données : des segments en équerre sur un plateau, verticaux entre deux. */
  readonly links: Array<readonly [Vec3, Vec3]>
}

const SLAB_STEP = 0.7
const CELL = 0.45
const BLOCK_LIFT = 0.18

/**
 * Projets — des composants techniques posés en étages, reliés par des flux.
 *
 * ⭐ Les liaisons d'un plateau sont tracées **en équerre** (d'abord en X, puis en
 * Z) : c'est ce qui fait lire un circuit, là où une diagonale ferait lire un
 * graphe. Entre deux étages, la liaison est verticale.
 */
export function isoArchitecture(levels: number, blockCount: number, seed: number): Architecture {
  const random = seededRandom(seed)
  const slabs = Array.from({ length: levels }, (_, i) => ({
    y: -0.9 + i * SLAB_STEP,
    size: 2.4 - i * 0.6,
  }))

  const parLevel: Vec3[][] = slabs.map(() => [])
  for (let b = 0; b < blockCount; b += 1) {
    const level = b % levels
    const slab = slabs[level] as { y: number; size: number }
    const cells = Math.max(1, Math.floor(slab.size / CELL) - 1)
    const taken = new Set((parLevel[level] as Vec3[]).map((p) => `${p[0]},${p[2]}`))
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const cx = (Math.floor(random() * cells) - (cells - 1) / 2) * CELL
      const cz = (Math.floor(random() * cells) - (cells - 1) / 2) * CELL
      if (taken.has(`${cx},${cz}`)) continue
      ;(parLevel[level] as Vec3[]).push([cx, slab.y + BLOCK_LIFT, cz])
      break
    }
  }

  const links: Array<readonly [Vec3, Vec3]> = []
  parLevel.forEach((blocks, level) => {
    const surface = (slabs[level] as { y: number }).y + 0.04
    for (const [a, b] of nearestEdges(blocks, 1)) {
      const from = blocks[a] as Vec3
      const to = blocks[b] as Vec3
      const corner: Vec3 = [to[0], surface, from[2]]
      links.push([[from[0], surface, from[2]], corner], [corner, [to[0], surface, to[2]]])
    }
    const below = parLevel[level - 1]
    const first = blocks[0]
    if (below && below.length > 0 && first) {
      const target = below.reduce((best, candidate) =>
        Math.hypot(candidate[0] - first[0], candidate[2] - first[2]) <
        Math.hypot(best[0] - first[0], best[2] - first[2])
          ? candidate
          : best,
      )
      // Descente verticale jusqu'au plateau du dessous, puis équerre vers la cible.
      const floor = (slabs[level - 1] as { y: number }).y + 0.04
      const drop: Vec3 = [first[0], floor, first[2]]
      const corner: Vec3 = [target[0], floor, first[2]]
      links.push([first, drop], [drop, corner], [corner, [target[0], floor, target[2]]])
    }
  })

  return { slabs, blocks: parLevel.flat(), links }
}
