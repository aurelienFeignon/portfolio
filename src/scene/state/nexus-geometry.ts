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
 * Des points régulièrement espacés sur une sphère (spirale de Fibonacci),
 * légèrement bousculés pour ne pas lire comme une grille.
 */
export function fibonacciSphere(
  count: number,
  radius: number,
  jitter: number,
  seed: number,
): Vec3[] {
  const random = seededRandom(seed)
  const golden = Math.PI * (3 - Math.sqrt(5))
  const points: Vec3[] = []

  for (let i = 0; i < count; i += 1) {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2
    const ring = Math.sqrt(1 - y * y)
    const angle = golden * i
    const r = radius * (1 + (random() * 2 - 1) * jitter)
    points.push([Math.cos(angle) * ring * r, y * r, Math.sin(angle) * ring * r])
  }

  return points
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
