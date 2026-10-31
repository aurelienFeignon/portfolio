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
import { type BoardExperience, compareSlugs } from './content.ts'
import { rectUnion } from './rect.ts'
import { EPSILON, type Rect, type Vec2 } from '../plane.ts'
import { TONES, type Tone } from '../layout.ts'

/** Longueur du bus en X, quel que soit le nombre d'années. */
export const BUS_LENGTH = 20
/** Au-delà de ce nombre d'années, le bus fait un lacet. */
const YEARS_PER_ROW = 8
/** Écart en Z entre deux voies parallèles. */
export const LANE_PITCH = 0.9
/** Écart en Z entre la dernière voie d'une rangée et la voie 0 de la suivante. */
export const ROW_GAP = 1.4
interface BusSegment {
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
  /**
   * Le milieu de la marche, sur la ligne de la voie : la frontière des deux
   * années ; au lacet (première case d'une rangée), un demi-pas de voie plus
   * loin, dans la case suivante.
   */
  readonly at: Vec2
  /**
   * La marche dessinée : la voie quitte sa ligne à 45° d'un demi-pas de voie
   * (`LANE_PITCH / 2`) vers le bord de la rangée le plus proche, puis y revient à 45°.
   * Premier et dernier points sont sur la ligne de la voie.
   */
  readonly points: readonly Vec2[]
}

export interface Timeline {
  readonly firstYear: number
  readonly lastYear: number
  readonly step: number
  readonly rows: number
  readonly lanes: number
  /** Z de la voie 0 au début de la rangée 0 : l'origine du bus (`timelineOriginZ`). */
  readonly originZ: number
  readonly segments: readonly BusSegment[]
  readonly idleYears: readonly number[]
  readonly jogs: readonly BusJog[]
  readonly milestones: readonly { year: number; at: Vec2 }[]
  /** La voie 0 de bout en bout, lacets compris. */
  readonly spine: readonly Vec2[]
  /** Toutes les voies de toutes les rangées, demi-tours compris. */
  readonly bounds: Rect
}

/** Écart en Z entre les voies 0 de deux rangées consécutives. */
const rowPitch = (lanes: number): number => lanes * LANE_PITCH + ROW_GAP

/** Cellule d'une année : sa rangée et son rang dans la rangée. */
const cellOf = (index: number): { row: number; col: number } => ({
  row: Math.floor(index / YEARS_PER_ROW),
  col: index % YEARS_PER_ROW,
})

/**
 * X d'une abscisse `local` (en années, depuis le début de la rangée `row`) :
 * vers la droite sur les rangées paires, vers la gauche sur les impaires.
 */
function xInRow(row: number, local: number, step: number): number {
  const half = BUS_LENGTH / 2
  return row % 2 === 0 ? -half + local * step : half - local * step
}

/**
 * Z d'une ligne située à `offset` de la voie 0, dans la rangée `row`.
 *
 * ⭐ L'ordre des voies **s'inverse à chaque rangée** : un ruban qui fait demi-tour
 * garde sa voie extérieure à l'extérieur du virage. C'est ce qui rend les
 * demi-tours concentriques — chaque voie relie deux Z dont l'intervalle contient
 * celui de la voie intérieure, donc deux voies ne se croisent jamais. Sans
 * inversion, les intervalles seraient décalés et se croiseraient forcément.
 */
function zInRow(originZ: number, lanes: number, row: number, offset: number): number {
  const base = originZ + row * rowPitch(lanes)
  return row % 2 === 0 ? base + offset : base + (lanes - 1) * LANE_PITCH - offset
}

/**
 * La marche à 45° d'un changement d'employeur sur la voie `lane`, au passage
 * de l'année `year` (premier poste du nouvel employeur).
 *
 * Triangle octilinéaire **centré sur la frontière** entre l'année précédente et
 * `year`, de hauteur `LANE_PITCH / 2` : deux segments à 45°, donc `LANE_PITCH / 2`
 * de longueur en X de chaque côté.
 *
 * ⭐ « Vers l'extérieur de la rangée » : le côté de la ligne de la voie qui
 * regarde le **bord de rangée le plus proche**. Un demi-pas de voie n'atteint
 * jamais la voisine (à un pas) : la marche ne la coupe pas, même pour une voie
 * intérieure d'une rangée de 4 voies ou plus (elle bombe alors vers la voisine
 * du côté du bord, sans l'atteindre). On le lit sur le Z réel (l'ordre des voies
 * s'inverse d'une rangée à l'autre, voir `zInRow`) : une voie sous le milieu de
 * la rangée (en Z) bombe vers −Z, une voie au-dessus vers +Z. Une voie au milieu exact — dont la rangée à voie
 * unique — bombe vers −Z (à l'opposé du bord du bus qui fait face au visiteur).
 *
 * ⭐ Si la frontière tombe sur un lacet (première case d'une rangée), la marche
 * ne peut pas la chevaucher : elle est placée au **début de la case suivante**,
 * la frontière en son premier point.
 */
function jogPoints(
  year: number,
  lane: number,
  firstYear: number,
  step: number,
  lanes: number,
  originZ: number,
): { at: Vec2; points: Vec2[] } {
  const { row, col } = cellOf(year - firstYear)
  const z = zInRow(originZ, lanes, row, lane * LANE_PITCH)
  const mid = zInRow(originZ, lanes, row, ((lanes - 1) * LANE_PITCH) / 2)
  const bulge = z > mid + EPSILON ? LANE_PITCH / 2 : -LANE_PITCH / 2
  const dir = row % 2 === 0 ? 1 : -1
  const boundary = xInRow(row, col, step)
  const half = LANE_PITCH / 2
  const apexX = col === 0 ? boundary + dir * half : boundary
  return {
    at: [apexX, z],
    points: [
      [apexX - dir * half, z],
      [apexX, z + bulge],
      [apexX + dir * half, z],
    ],
  }
}

/** Le centre de la cellule d'indice `index`, sur la ligne de la voie `lane`. */
function cellPoint(
  index: number,
  lane: number,
  step: number,
  lanes: number,
  originZ: number,
): Vec2 {
  const { row, col } = cellOf(index)
  return [xInRow(row, col + 0.5, step), zInRow(originZ, lanes, row, lane * LANE_PITCH)]
}

/** Le pas (en X) d'une année, pour `count` années : la frise garde sa longueur. */
const stepFor = (count: number): number => BUS_LENGTH / Math.min(count, YEARS_PER_ROW)

/** Un profil de décalage : points `[u, décalage]` triés, `u` strictement croissant. */
type Profile = readonly (readonly [number, number])[]

/** Décalage en l'abscisse `u` (comprise dans le profil), interpolé linéairement. */
function offsetAt(profile: Profile, u: number): number {
  let i = 1
  while (i < profile.length - 1 && u > profile[i]![0] + EPSILON) i += 1
  const [u0, o0] = profile[i - 1]!
  const [u1, o1] = profile[i]!
  return o0 + ((o1 - o0) * (u - u0)) / (u1 - u0)
}

/**
 * Polyligne entre les abscisses `from` et `to` (en années depuis le début du
 * bus), le décalage de voie suivant `profile`. Chaque changement de rangée est
 * un demi-tour fait de deux segments à 45° ; chaque changement de décalage est
 * une pente à 45° (le profil est exprimé en unités de longueur).
 *
 * ⭐ Un tracé qui **commence** exactement sur une fin de rangée emporte le
 * demi-tour qui suit : il appartient au tronçon qui le franchit, pas à celui
 * qui s'arrête là.
 */
function buildPath(
  from: number,
  to: number,
  profile: Profile,
  step: number,
  lanes: number,
  originZ: number,
): Vec2[] {
  const out: Vec2[] = []
  const push = (p: Vec2): void => {
    const last = out.at(-1)
    if (!last || Math.abs(last[0] - p[0]) > EPSILON || Math.abs(last[1] - p[1]) > EPSILON)
      out.push(p)
  }
  const firstRow = Math.max(0, Math.ceil(from / YEARS_PER_ROW - EPSILON) - 1)
  const lastRow = Math.ceil(to / YEARS_PER_ROW - EPSILON) - 1
  for (let row = firstRow; row <= lastRow; row += 1) {
    const rowStart = row * YEARS_PER_ROW
    const lo = Math.max(from, rowStart)
    const hi = Math.min(to, rowStart + YEARS_PER_ROW)
    const us = [
      lo,
      ...profile.map(([u]) => u).filter((u) => u > lo + EPSILON && u < hi - EPSILON),
      hi,
    ]
    for (const u of us) {
      push([xInRow(row, u - rowStart, step), zInRow(originZ, lanes, row, offsetAt(profile, u))])
    }
    if (row < lastRow) {
      // Demi-tour : deux segments à 45°, qui débordent de la moitié de l'écart
      // en Z entre les deux voies reliées.
      const side = row % 2 === 0 ? 1 : -1
      const o = offsetAt(profile, hi)
      const x = xInRow(row, YEARS_PER_ROW, step)
      const za = zInRow(originZ, lanes, row, o)
      const zb = zInRow(originZ, lanes, row + 1, o)
      push([x + (side * (zb - za)) / 2, (za + zb) / 2])
      push([x, zb])
    }
  }
  return out
}

/**
 * Le profil de décalage d'un poste de `s` à `e` (en années) sur la voie `lane`.
 *
 * La voie `k` **part de la voie `source`** et **rejoint la voie `target`** :
 * chacune est la plus haute voie plus basse qui tient **sa hauteur** à cette
 * abscisse — la voie 0 à défaut (`attachLane`). Ainsi une branche ne commence
 * ni ne finit dans le vide, et ne traverse jamais une voie intermédiaire. Un
 * poste en cours ne rejoint pas. Si le poste est trop court pour atteindre sa
 * voie, la pente s'arrête à mi-chemin (toujours à 45°).
 *
 * Les abscisses confondues sont retirées (une pente nulle se divise par zéro) :
 * le profil rendu a ses `u` strictement croissants.
 */
function laneProfile(
  s: number,
  e: number,
  lane: number,
  source: number,
  target: number,
  ongoing: boolean,
  step: number,
): Profile {
  const from = source * LANE_PITCH
  const top = lane * LANE_PITCH
  const to = target * LANE_PITCH
  const width = (e - s) * step
  const at = (x: number): number => s + x / step
  let points: Profile
  if (lane === 0) {
    points = [
      [s, 0],
      [e, 0],
    ]
  } else if (ongoing) {
    // Un poste en cours monte jusqu'à sa voie — ou jusqu'au bout du bus, si la
    // montée (plusieurs voies d'un coup) ne tient pas dans ce qui reste.
    const rise = Math.min(top - from, width)
    points = [
      [s, from],
      [at(rise), from + rise],
      [e, from + rise],
    ]
  } else if (width >= top - from + (top - to)) {
    const rise = top - from
    const fall = top - to
    points = [
      [s, from],
      [at(rise), top],
      [at(width - fall), top],
      [e, to],
    ]
  } else {
    // Trop court : sommet à l'intersection des deux pentes (borné à la largeur).
    const apex = Math.min(Math.max((to - from + width) / 2, 0), width)
    points = [
      [s, from],
      [at(apex), from + apex],
      [e, from + apex - (width - apex)],
    ]
  }
  return points.filter((p, i) => i === points.length - 1 || points[i + 1]![0] - p[0] > EPSILON)
}

export function planTimeline(
  experiences: readonly BoardExperience[],
  currentYear: number,
  originZ: number,
): Timeline {
  const sorted = [...experiences].sort(
    (a, b) => a.startYear - b.startYear || compareSlugs(a.slug, b.slug),
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
  const occupied = new Set<number>()
  const placed = sorted.map((e) => {
    const end = e.endYear === null ? lastYear : Math.max(e.endYear, e.startYear)
    let lane = freeFrom.findIndex((from) => from <= e.startYear)
    if (lane === -1) lane = freeFrom.length
    freeFrom[lane] = e.endYear === null ? Number.POSITIVE_INFINITY : end + 1
    return { e, lane, end, ongoing: e.endYear === null }
  })
  const lanes = Math.max(1, freeFrom.length)
  const pitch = rowPitch(lanes)

  const yearPos = (year: number, lane: number): Vec2 =>
    cellPoint(year - firstYear, lane, step, lanes, originZ)

  // Abscisses (en années depuis le début du bus) de chaque poste.
  const spanOf = (p: (typeof placed)[number]) => ({
    s: p.e.startYear - firstYear,
    e: p.end - firstYear + 1,
  })
  // Les profils, de la voie la plus basse à la plus haute : une voie se
  // rattache aux voies plus basses, dont le profil est alors connu.
  const profiles = new Map<(typeof placed)[number], Profile>()
  /**
   * La plus haute voie plus basse que `lane` qui tient **sa hauteur** en `u` —
   * un poste qui y monte ou en redescend n'y est pas ; la voie 0 à défaut.
   */
  const attachLane = (lane: number, u: number): number =>
    placed.reduce((best, o) => {
      const { s, e } = spanOf(o)
      const profile = profiles.get(o)
      const holds =
        profile !== undefined &&
        s < u - EPSILON &&
        u <= e + EPSILON &&
        Math.abs(offsetAt(profile, u) - o.lane * LANE_PITCH) < EPSILON
      return o.lane < lane && o.lane > best && holds ? o.lane : best
    }, 0)
  for (const p of [...placed].sort((a, b) => a.lane - b.lane)) {
    const { s, e } = spanOf(p)
    const source = attachLane(p.lane, s)
    const target = attachLane(p.lane, e)
    profiles.set(p, laneProfile(s, e, p.lane, source, target, p.ongoing, step))
  }

  const segments: BusSegment[] = []
  const jogs: BusJog[] = []
  placed.forEach((p, i) => {
    const { e, lane, end, ongoing } = p
    const span = spanOf(p)
    const mid = e.startYear + Math.floor((end - e.startYear) / 2)
    segments.push({
      experience: e.slug,
      lane,
      tone: TONES[i % TONES.length]!,
      startYear: e.startYear,
      endYear: end,
      ongoing,
      points: buildPath(span.s, span.e, profiles.get(p)!, step, lanes, originZ),
      labelAnchor: yearPos(mid, lane),
    })
    if (occupied.has(lane))
      jogs.push({
        lane,
        year: e.startYear,
        ...jogPoints(e.startYear, lane, firstYear, step, lanes, originZ),
      })
    occupied.add(lane)
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
      // Le demi-tour le plus large (la voie extérieure) déborde de la moitié de
      // l'écart entre ses deux rangées, du côté où la rangée se termine.
      const bulge = (pitch + (lanes - 1) * LANE_PITCH) / 2
      const out =
        row % 2 === 0 ? { minX: half, maxX: half + bulge } : { minX: -half - bulge, maxX: -half }
      parts.push({ ...out, minZ: z, maxZ: z + pitch + (lanes - 1) * LANE_PITCH })
    }
  }

  return {
    firstYear,
    lastYear,
    step,
    rows,
    lanes,
    originZ,
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
 * sens du lacet pris en compte.
 */
export function yearPoint(timeline: Timeline, year: number, lane: number): Vec2 {
  return cellPoint(year - timeline.firstYear, lane, timeline.step, timeline.lanes, timeline.originZ)
}
