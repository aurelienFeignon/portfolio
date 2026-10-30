/**
 * Le bus du temps de la carte mère (P8-14b) — la frise des expériences.
 *
 * Règles : `docs/carte-mere.md` §5, « Expériences — le bus ». Module **pur** :
 * l'année courante et l'origine en Z sont des paramètres (jamais `Date`).
 *
 * Repère : le bus s'étend en X sur `[-BUS_LENGTH/2, +BUS_LENGTH/2]`. Une année
 * occupe une cellule d'un `step` ; les rangées paires vont de gauche à droite,
 * les impaires de droite à gauche (lacet). Z croît vers le visiteur : les
 * rangées s'empilent vers +Z à partir de `originZ`, et la voie `k` d'une rangée
 * est à `k × LANE_PITCH` de la voie 0.
 */
import type { BoardExperience } from './content'
import type { Rect, Vec2 } from './rect'
import { rectUnion } from './rect'
import { TONES, type Tone } from '../layout'

/** Longueur du bus en X, quel que soit le nombre d'années. */
export const BUS_LENGTH = 20
/** Au-delà de ce nombre d'années, le bus fait un lacet. */
export const YEARS_PER_ROW = 8
/** Écart en Z entre deux voies parallèles. */
export const LANE_PITCH = 0.9
/** Écart en Z entre la dernière voie d'une rangée et la voie 0 de la suivante. */
export const ROW_GAP = 1.4
/** Nombre de fils d'une voie (consommé par le rendu). */
export const BUS_WIRES = 8

export interface BusSegment {
  readonly experience: string
  readonly lane: number
  readonly tone: Tone
  readonly startYear: number
  readonly endYear: number
  readonly ongoing: boolean
  /** Polyligne octilinéaire : voie 0 → voie `lane` → voie 0, lacets compris. */
  readonly points: readonly Vec2[]
  readonly labelAnchor: Vec2
}

export interface BusJog {
  readonly lane: number
  readonly year: number
  readonly at: Vec2
}

export interface Timeline {
  readonly firstYear: number
  readonly lastYear: number
  readonly step: number
  readonly rows: number
  readonly lanes: number
  readonly segments: readonly BusSegment[]
  readonly idleYears: readonly number[]
  readonly jogs: readonly BusJog[]
  readonly milestones: readonly { year: number; at: Vec2 }[]
  /** La voie 0 de bout en bout, lacets compris. */
  readonly spine: readonly Vec2[]
  /** Toutes les voies de toutes les rangées, demi-tours compris. */
  readonly bounds: Rect
}

const EPS = 1e-9

/** Écart en Z entre les voies 0 de deux rangées consécutives. */
const rowPitch = (lanes: number): number => lanes * LANE_PITCH + ROW_GAP

/** Cellule d'une année : sa rangée et son rang dans la rangée. */
const cellOf = (index: number): { row: number; col: number } => ({
  row: Math.floor(index / YEARS_PER_ROW),
  col: index % YEARS_PER_ROW,
})

/** Le centre de la cellule d'indice `index`, sur la ligne de la voie `lane`. */
function cellPoint(
  index: number,
  lane: number,
  step: number,
  lanes: number,
  originZ: number,
): Vec2 {
  const { row, col } = cellOf(index)
  return [xInRow(row, col + 0.5, step), originZ + row * rowPitch(lanes) + lane * LANE_PITCH]
}

/**
 * X d'une abscisse `local` (en années, depuis le début de la rangée `row`) :
 * vers la droite sur les rangées paires, vers la gauche sur les impaires.
 */
function xInRow(row: number, local: number, step: number): number {
  const half = BUS_LENGTH / 2
  return row % 2 === 0 ? -half + local * step : half - local * step
}

/** Les années à couvrir et le pas, pour `count` années. */
const stepFor = (count: number): number => BUS_LENGTH / Math.min(count, YEARS_PER_ROW)

/**
 * Décalage en Z (par rapport à la voie 0) en l'abscisse `u`, interpolé entre
 * les `breakpoints` triés `[u, décalage]`.
 */
function offsetAt(breakpoints: readonly (readonly [number, number])[], u: number): number {
  for (let i = 1; i < breakpoints.length; i += 1) {
    const [u0, o0] = breakpoints[i - 1]!
    const [u1, o1] = breakpoints[i]!
    if (u <= u1 + EPS) return u1 - u0 < EPS ? o1 : o0 + ((o1 - o0) * (u - u0)) / (u1 - u0)
  }
  return breakpoints.at(-1)![1]
}

/**
 * Polyligne entre les abscisses `from` et `to` (en années depuis le début du
 * bus), le décalage de voie suivant `breakpoints`. Chaque changement de rangée
 * est un demi-tour fait de deux segments à 45° (D/2 en X pour D en Z) ; chaque
 * changement de décalage est une pente à 45° (1 en X pour 1 en Z), que
 * `breakpoints` exprime déjà en unités de longueur.
 */
function buildPath(
  from: number,
  to: number,
  breakpoints: readonly (readonly [number, number])[],
  step: number,
  lanes: number,
  originZ: number,
): Vec2[] {
  const out: Vec2[] = []
  const push = (p: Vec2): void => {
    const last = out.at(-1)
    if (!last || Math.abs(last[0] - p[0]) > EPS || Math.abs(last[1] - p[1]) > EPS) out.push(p)
  }
  const pitch = rowPitch(lanes)
  const firstRow = Math.floor(from / YEARS_PER_ROW + EPS)
  const lastRow = Math.ceil(to / YEARS_PER_ROW - EPS) - 1
  for (let row = firstRow; row <= lastRow; row += 1) {
    const rowStart = row * YEARS_PER_ROW
    const lo = Math.max(from, rowStart)
    const hi = Math.min(to, rowStart + YEARS_PER_ROW)
    const us = [lo, ...breakpoints.map(([u]) => u).filter((u) => u > lo + EPS && u < hi - EPS), hi]
    const baseZ = originZ + row * pitch
    for (const u of us) push([xInRow(row, u - rowStart, step), baseZ + offsetAt(breakpoints, u)])
    if (row < lastRow) {
      // Demi-tour : deux segments à 45°, qui débordent de D/2 hors de la rangée.
      const side = row % 2 === 0 ? 1 : -1
      const o = offsetAt(breakpoints, hi)
      const x = xInRow(row, YEARS_PER_ROW, step)
      push([x + (side * pitch) / 2, baseZ + o + pitch / 2])
      push([x, baseZ + pitch + o])
    }
  }
  return out
}

/**
 * Le décalage de voie en fonction de l'abscisse pour un poste de `s` à `e`
 * (en années) sur la voie `lane` : il part de 0, monte à 45° jusqu'à la voie,
 * la suit, puis redescend à 45° — sauf s'il est en cours. Si le poste est trop
 * court pour atteindre la voie, la montée s'arrête à mi-chemin.
 */
function laneProfile(
  s: number,
  e: number,
  lane: number,
  ongoing: boolean,
  step: number,
): (readonly [number, number])[] {
  if (lane === 0)
    return [
      [s, 0],
      [e, 0],
    ]
  const rise = (lane * LANE_PITCH) / step
  if (ongoing) {
    const reach = Math.min(rise, e - s)
    return [
      [s, 0],
      [s + reach, reach * step],
      ...(reach < e - s ? [[e, reach * step] as const] : []),
    ]
  }
  if (e - s < 2 * rise) {
    const mid = (s + e) / 2
    return [
      [s, 0],
      [mid, (mid - s) * step],
      [e, 0],
    ]
  }
  return [
    [s, 0],
    [s + rise, lane * LANE_PITCH],
    [e - rise, lane * LANE_PITCH],
    [e, 0],
  ]
}

export function planTimeline(
  experiences: readonly BoardExperience[],
  currentYear: number,
  originZ: number,
): Timeline {
  const sorted = [...experiences].sort(
    (a, b) => a.startYear - b.startYear || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
  )
  const firstYear = sorted.length > 0 ? sorted[0]!.startYear : currentYear
  const lastYear = Math.max(
    currentYear,
    ...sorted.flatMap((e) => [e.startYear, e.endYear ?? e.startYear]),
  )
  const count = lastYear - firstYear + 1
  const step = stepFor(count)
  const rows = Math.ceil(count / YEARS_PER_ROW)

  // Voies : la plus petite libre à l'année de début ; libérée l'année qui suit la fin.
  const freeFrom: number[] = []
  const occupied = new Map<number, number>()
  const placed = sorted.map((e) => {
    const end = e.endYear === null ? lastYear : Math.min(Math.max(e.endYear, e.startYear), lastYear)
    let lane = freeFrom.findIndex((from) => from <= e.startYear)
    if (lane === -1) lane = freeFrom.length
    freeFrom[lane] = e.endYear === null ? Number.POSITIVE_INFINITY : end + 1
    return { e, lane, end, ongoing: e.endYear === null }
  })
  const lanes = Math.max(1, freeFrom.length)
  const pitch = rowPitch(lanes)

  const yearPos = (year: number, lane: number): Vec2 =>
    cellPoint(year - firstYear, lane, step, lanes, originZ)

  const segments: BusSegment[] = []
  const jogs: BusJog[] = []
  placed.forEach(({ e, lane, end, ongoing }, i) => {
    const s = e.startYear - firstYear
    const profile = laneProfile(s, end - firstYear + 1, lane, ongoing, step)
    const mid = e.startYear + Math.floor((end - e.startYear) / 2)
    segments.push({
      experience: e.slug,
      lane,
      tone: TONES[i % TONES.length]!,
      startYear: e.startYear,
      endYear: end,
      ongoing,
      points: buildPath(s, end - firstYear + 1, profile, step, lanes, originZ),
      labelAnchor: yearPos(mid, lane),
    })
    if (occupied.has(lane)) jogs.push({ lane, year: e.startYear, at: yearPos(e.startYear, lane) })
    occupied.set(lane, i)
  })

  const idleYears: number[] = []
  const milestones: { year: number; at: Vec2 }[] = []
  for (let year = firstYear; year <= lastYear; year += 1) {
    milestones.push({ year, at: yearPos(year, 0) })
    if (!placed.some((p) => p.e.startYear <= year && year <= p.end)) idleYears.push(year)
  }

  const half = BUS_LENGTH / 2
  const parts: Rect[] = []
  for (let row = 0; row < rows; row += 1) {
    const z = originZ + row * pitch
    parts.push({ minX: -half, maxX: half, minZ: z, maxZ: z + (lanes - 1) * LANE_PITCH })
    if (row < rows - 1) {
      // Le demi-tour déborde de D/2 du côté où la rangée se termine.
      const out =
        row % 2 === 0
          ? { minX: half, maxX: half + pitch / 2 }
          : { minX: -half - pitch / 2, maxX: -half }
      parts.push({ ...out, minZ: z, maxZ: z + pitch + (lanes - 1) * LANE_PITCH })
    }
  }

  return {
    firstYear,
    lastYear,
    step,
    rows,
    lanes,
    segments,
    idleYears,
    jogs,
    milestones,
    spine: buildPath(
      0,
      count,
      [
        [0, 0],
        [count, 0],
      ],
      step,
      lanes,
      originZ,
    ),
    bounds: rectUnion(parts)!,
  }
}

/**
 * Le centre de la cellule de `year`, sur la ligne de la voie `lane`, rangée et
 * sens du lacet pris en compte. L'origine en Z se lit sur le début de la
 * voie 0 (`spine[0]`).
 */
export function yearPoint(timeline: Timeline, year: number, lane: number): Vec2 {
  return cellPoint(
    year - timeline.firstYear,
    lane,
    timeline.step,
    timeline.lanes,
    timeline.spine[0]![1],
  )
}
