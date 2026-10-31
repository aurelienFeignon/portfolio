/**
 * Les **impulsions lumineuses** de la carte mère (P8-15e, `carte-mere.md` §4) : des paquets qui
 * courent sur le bus, dans le sens du temps, et sur les pistes de liaison, vers les processeurs.
 *
 * ⭐ Tout est déterministe : aucune graine, aucun tirage. Les `count` impulsions se répartissent
 * entre les chemins proportionnellement à leur longueur (plus fort reste), à égale distance les
 * unes des autres sur un même chemin, et avancent à `PULSE_SPEED` unités par seconde. Une
 * impulsion ne dépend que du temps : à temps figé (`prefers-reduced-motion`), elle est immobile
 * mais visible ; au bout d'une période (`longueur / PULSE_SPEED`), elle revient où elle était.
 *
 * Le temps est celui de `ambientFrame` (accumulé, borné) — jamais `clock.elapsedTime`.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import type { Vec2 } from '../plane.ts'
import type { BoardFile } from './file-format.ts'
import { dedupe, edgeLength, polylineLength } from './polyline.ts'

/** Vitesse d'une impulsion, en unités de scène par seconde (identique sur tous les chemins). */
export const PULSE_SPEED = 2.2

export interface PulsePath {
  readonly kind: 'bus' | 'link'
  readonly points: readonly Vec2[]
  /** Longueur de la polyligne, en unités de scène. */
  readonly length: number
}

/**
 * Le seul constructeur d'un chemin : la polyligne sans ses points répétés (`dedupe`, la même
 * fusion que les rubans — l'impulsion court sur le tracé dessiné ; un point répété rendrait
 * `0 / 0`), et sa longueur. `null` pour un chemin de longueur nulle, qui rendrait `Infinity` ou
 * `NaN`.
 */
export function makePath(kind: PulsePath['kind'], raw: readonly Vec2[]): PulsePath | null {
  const points = dedupe(raw)
  const length = polylineLength(points)
  return points.length > 1 && length > 0 ? { kind, points, length } : null
}

/** Distance d'un point au rectangle carré d'un processeur (0 s'il le touche ou y est). */
const distanceToBox = (point: Vec2, center: Vec2, size: number): number => {
  const half = size / 2
  return Math.hypot(
    Math.max(Math.abs(point[0] - center[0]) - half, 0),
    Math.max(Math.abs(point[1] - center[1]) - half, 0),
  )
}

/**
 * Les chemins des impulsions : le bus d'abord (sa colonne vertébrale, de la plus ancienne année
 * à la plus récente), puis chaque piste **orientée vers un processeur** : l'extrémité la plus
 * proche d'un processeur est la dernière. Le sens se décide **sur la géométrie, jamais sur
 * `route.kind`** : si le premier point est plus près d'un processeur que le dernier, la route est
 * renversée, et la lumière va donc toujours **du côté éloigné vers le processeur** (du bus vers le
 * processeur pour une prise au bus ou une liaison). Les points répétés sont fusionnés, et tout
 * chemin de longueur nulle — le bus compris — est ignoré : il rendrait `Infinity` ou `NaN`.
 */
export function pulsePaths(file: BoardFile): readonly PulsePath[] {
  const { timeline, traces, district } = file.plan
  const toProcessor = (point: Vec2): number =>
    Math.min(...district.processors.map((p) => distanceToBox(point, p.center, p.size)))
  const paths = [makePath('bus', timeline.spine)]
  for (const route of traces.routes) {
    const path = makePath('link', route.points)
    if (path === null) continue
    const { points } = path
    paths.push(
      toProcessor(points[0]!) < toProcessor(points.at(-1)!)
        ? { ...path, points: points.toReversed() }
        : path,
    )
  }
  return paths.filter((path): path is PulsePath => path !== null)
}

/** Où se trouve chaque impulsion : son chemin, et sa phase (0 à 1) à l'instant 0. */
interface Slots {
  readonly count: number
  readonly path: Uint32Array
  readonly phase: Float32Array
}

const slotCache = new WeakMap<readonly PulsePath[], Slots>()

/** Répartition au plus fort reste de `count` impulsions entre les chemins, selon leur longueur. */
function allocate(paths: readonly PulsePath[], count: number): Slots {
  const total = paths.reduce((sum, p) => sum + p.length, 0)
  const shares = paths.map((p) => (count * p.length) / total)
  const counts = shares.map(Math.floor)
  const order = shares
    .map((share, index) => ({ index, rest: share - Math.floor(share) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index)
  let missing = count - counts.reduce((sum, n) => sum + n, 0)
  for (const { index } of order) {
    if (missing <= 0) break
    counts[index]! += 1
    missing -= 1
  }
  const path = new Uint32Array(count)
  const phase = new Float32Array(count)
  let slot = 0
  counts.forEach((n, index) => {
    for (let j = 0; j < n; j++) {
      path[slot] = index
      phase[slot] = j / n
      slot += 1
    }
  })
  return { count, path, phase }
}

/**
 * Les positions `[x, z, x, z, …]` de `count` impulsions à l'instant `timeS` (secondes de scène).
 * `out` (optionnel, de `2 × count` flottants au moins) évite toute allocation par image ; sinon
 * un tampon neuf est rendu. Rien à répartir (aucun chemin, aucune impulsion) : tampon vide.
 */
export function pulseFrame(
  paths: readonly PulsePath[],
  count: number,
  timeS: number,
  out?: Float32Array,
): Float32Array {
  if (paths.length === 0 || count <= 0) return out ?? new Float32Array(0)
  const result = out ?? new Float32Array(count * 2)
  let slots = slotCache.get(paths)
  if (slots === undefined || slots.count !== count) {
    slots = allocate(paths, count)
    slotCache.set(paths, slots)
  }
  for (let i = 0; i < count; i++) {
    const path = paths[slots.path[i]!]!
    const unit = (((slots.phase[i]! + (timeS * PULSE_SPEED) / path.length) % 1) + 1) % 1
    let remaining = unit * path.length
    const points = path.points
    // Au-delà de la dernière arête (arrondi flottant) : le dernier point.
    let x = points.at(-1)![0]
    let z = points.at(-1)![1]
    for (let k = 1; k < points.length; k++) {
      const ax = points[k - 1]![0]
      const az = points[k - 1]![1]
      const bx = points[k]![0]
      const bz = points[k]![1]
      const segment = edgeLength(points[k - 1]!, points[k]!)
      // ⛔ Une arête nulle ne se divise pas. `makePath` n'en rend aucune, mais `PulsePath` est
      // un type ouvert : un chemin écrit à la main (les bancs) peut en porter.
      if (segment > 0 && remaining <= segment) {
        const t = remaining / segment
        x = ax + (bx - ax) * t
        z = az + (bz - az) * t
        break
      }
      remaining -= segment
    }
    result[i * 2] = x
    result[i * 2 + 1] = z
  }
  return result
}
