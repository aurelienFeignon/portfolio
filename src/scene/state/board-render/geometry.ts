/**
 * La géométrie de la carte mère **telle que la scène la dessine** (P8-15d) : rubans des pistes
 * et du bus, matrices et teintes des formes instanciées, compte des appels de dessin.
 *
 * ⭐⭐ **Le budget de §9 se tient ici, pas dans les composants** : toutes les pistes tiennent en
 * UNE géométrie (`traceRibbons`, l'état de survol passera par `routeIndex`), le bus en une
 * autre (`busRibbons`), et chaque forme — puces, broches, processeurs, capots… — en UN
 * `InstancedMesh` (`instances`). `drawCallBudget` en déduit le nombre de maillages, épinglé par
 * un banc à 60 au plus.
 *
 * Repère : celui du plan (X vers la droite, Z vers le visiteur, Y vers le haut) ; la carte est à
 * plat, son dessus en `y = 0`. Les rubans sont rendus à `y = 0` : la scène les soulève.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`. ⛔ Aucune **valeur** de `board/` —
 * seulement ses types, effacés à la compilation (`carte-mere.md` §12.4).
 */
import type { BoardPlan } from '../board/plan.ts'
import type { Vec2 } from '../board/rect.ts'
import type { BusJog, Timeline } from '../board/timeline.ts'
import type { Route } from '../board/traces.ts'
import { BOARD_DENSITY, BUS_WIRES, type DensityTier, PALETTE, type Tone, TONES } from '../layout.ts'

/* ------------------------------------------------------------------ rubans */

/**
 * Largeur du ruban d'une piste selon ce qu'elle porte, **halo compris** (le cœur lumineux en
 * occupe un gros tiers) : un tronc de famille porte toute sa zone, une prise au bus relie un
 * projet à son poste, une liaison une seule compétence. Des largeurs égales feraient les « tubes
 * uniformes » que §2 range parmi les anti-objectifs.
 */
const TRACE_WIDTHS: Readonly<Record<Route['kind'], number>> = {
  link: 0.15,
  'bus-link': 0.2,
  trunk: 0.26,
}

export const traceWidth = (route: Route): number => TRACE_WIDTHS[route.kind]

/** Écart entre deux fils voisins du bus, et largeur d'un fil (halo compris). */
export const BUS_WIRE_PITCH = 0.07
export const BUS_WIRE_WIDTH = 0.06

/**
 * Plafond du biseau, en demi-largeurs : un demi-tour presque complet donnerait une pointe sans
 * fin. L'octilinéaire ne tourne jamais de plus de 135° (facteur 2,6) ; le plafond ne sert qu'aux
 * entrées dégénérées.
 */
const MITER_LIMIT = 4

export interface Ribbons {
  /** `x, y, z` par sommet, `y = 0`. Deux sommets par point : gauche puis droite. */
  readonly positions: Float32Array
  readonly indices: Uint32Array
  /** Abscisse curviligne du point, en unités de scène (les impulsions, le scintillement). */
  readonly along: Float32Array
  /** `+1` à gauche, `−1` à droite : le shader en tire le cœur et le halo du ruban. */
  readonly across: Float32Array
}

export interface TraceRibbons extends Ribbons {
  /** Indice de la route dans `plan.traces.routes`, par sommet : l'état de survol (P8-15f). */
  readonly routeIndex: Float32Array
}

export interface BusRibbons extends Ribbons {
  /** Indice du tronçon dans `timeline.segments`, par sommet ; `−1` pour une voie éteinte. */
  readonly segmentIndex: Float32Array
  /** `1` sur une année sans poste (`idleYears`), `0` ailleurs. */
  readonly idle: Float32Array
}

class RibbonWriter {
  readonly positions: number[] = []
  readonly indices: number[] = []
  readonly along: number[] = []
  readonly across: number[] = []

  /** Le nombre de sommets écrits jusqu'ici. */
  get vertices(): number {
    return this.along.length
  }

  /**
   * Écrit le ruban de `points` (sans doublons consécutifs, au moins deux), de demi-largeur
   * `half`, décalé de `offset` vers la gauche du sens de parcours. Rend le nombre de sommets.
   */
  write(points: readonly Vec2[], half: number, offset = 0): number {
    const base = this.vertices
    const miters = miterNormals(points)
    let distance = 0
    points.forEach((p, i) => {
      if (i > 0) distance += Math.hypot(p[0] - points[i - 1]![0], p[1] - points[i - 1]![1])
      const [mx, mz] = miters[i]!
      const cx = p[0] + mx * offset
      const cz = p[1] + mz * offset
      this.positions.push(cx + mx * half, 0, cz + mz * half, cx - mx * half, 0, cz - mz * half)
      this.along.push(distance, distance)
      this.across.push(1, -1)
    })
    for (let i = 0; i < points.length - 1; i++) {
      const a = base + i * 2
      this.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
    return points.length * 2
  }

  ribbons(): Ribbons {
    return {
      positions: new Float32Array(this.positions),
      indices: new Uint32Array(this.indices),
      along: new Float32Array(this.along),
      across: new Float32Array(this.across),
    }
  }
}

const samePoint = (a: Vec2, b: Vec2): boolean =>
  Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6

/** La polyligne sans ses points répétés consécutifs. */
function dedupe(points: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = []
  for (const p of points) if (out.length === 0 || !samePoint(out.at(-1)!, p)) out.push(p)
  return out
}

/** La normale gauche (`(−dz, dx)`) unitaire du tronçon `a → b`. */
function leftNormal(a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const length = Math.hypot(dx, dz)
  return [-dz / length, dx / length]
}

/**
 * Pour chaque point, le vecteur qui porte la demi-largeur unité : la normale aux extrémités, la
 * bissectrice allongée de `1 / cos(θ/2)` aux coudes — le **joint biseauté**, qui garde la largeur
 * du ruban constante de part et d'autre du coude.
 */
function miterNormals(points: readonly Vec2[]): Vec2[] {
  const edges = points.slice(1).map((p, i) => leftNormal(points[i]!, p))
  return points.map((_, i) => {
    const before = edges[i - 1]
    const after = edges[i]
    if (!before) return after!
    if (!after) return before
    const sx = before[0] + after[0]
    const sz = before[1] + after[1]
    const length = Math.hypot(sx, sz)
    if (length < 1e-6) return before
    const mx = sx / length
    const mz = sz / length
    const scale = Math.min(1 / (mx * before[0] + mz * before[1]), MITER_LIMIT)
    return [mx * scale, mz * scale]
  })
}

/**
 * **Toutes** les pistes en une géométrie : des rubans plats, joints biseautés aux coudes, deux
 * sommets par point ; `width` est commune, ou propre à chaque route (`traceWidth`). Une route réduite à un point (après fusion des doublons) ne produit rien —
 * jamais un ruban de longueur nulle.
 */
export function traceRibbons(
  routes: readonly Route[],
  width: number | ((route: Route) => number),
): TraceRibbons {
  const writer = new RibbonWriter()
  const routeIndex: number[] = []
  routes.forEach((route, i) => {
    const points = dedupe(route.points)
    if (points.length < 2) return
    const count = writer.write(points, (typeof width === 'number' ? width : width(route)) / 2)
    for (let v = 0; v < count; v++) routeIndex.push(i)
  })
  return { ...writer.ribbons(), routeIndex: new Float32Array(routeIndex) }
}

/** Vrai si `p` est sur le segment `[a, b]`, extrémités comprises. */
function onSegment(p: Vec2, a: Vec2, b: Vec2): boolean {
  const abx = b[0] - a[0]
  const abz = b[1] - a[1]
  const apx = p[0] - a[0]
  const apz = p[1] - a[1]
  if (Math.abs(abx * apz - abz * apx) > 1e-6) return false
  const dot = abx * apx + abz * apz
  return dot >= -1e-6 && dot <= abx * abx + abz * abz + 1e-6
}

/**
 * Le tracé d'un tronçon du bus, la marche à 45° d'un changement d'employeur **dessinée** (§11,
 * §12.3) : la marche du plan (`BusJog.points`, trois points) remplace la portion droite qu'elle
 * enjambe.
 *
 * Trois cas, parce que la marche est centrée sur la frontière entre deux postes :
 * - un tronçon la porte entière (au lacet, elle est dans la case suivante) : elle s'y insère ;
 * - le tronçon **qui s'achève** à la frontière monte jusqu'au sommet ;
 * - le tronçon **qui commence** à la frontière part du sommet.
 * Sinon le tracé est rendu tel quel (même instance).
 */
export function withJog(path: readonly Vec2[], jog: BusJog): readonly Vec2[] {
  const [p0, p1, p2] = jog.points as readonly [Vec2, Vec2, Vec2]
  for (let i = 0; i < path.length - 1; i++) {
    if (onSegment(p0, path[i]!, path[i + 1]!) && onSegment(p2, path[i]!, path[i + 1]!)) {
      return dedupe([...path.slice(0, i + 1), p0, p1, p2, ...path.slice(i + 1)])
    }
  }
  const mid: Vec2 = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2]
  const last = path.at(-1)!
  if (path.length >= 2 && samePoint(last, mid) && onSegment(p0, path.at(-2)!, last)) {
    return dedupe([...path.slice(0, -1), p0, p1])
  }
  if (path.length >= 2 && samePoint(path[0]!, mid) && onSegment(p2, path[0]!, path[1]!)) {
    return dedupe([p1, p2, ...path.slice(1)])
  }
  return path
}

/** Les morceaux de voie 0 des années sans poste : années consécutives d'une même rangée fusionnées. */
function idlePieces(timeline: Timeline): Vec2[][] {
  const pieces: Vec2[][] = []
  let current: { minX: number; maxX: number; z: number; year: number } | null = null
  const flush = (): void => {
    if (current === null) return
    const half = timeline.step / 2
    pieces.push([
      [current.minX - half, current.z],
      [current.maxX + half, current.z],
    ])
    current = null
  }
  for (const year of [...timeline.idleYears].sort((a, b) => a - b)) {
    const milestone = timeline.milestones.find((m) => m.year === year)
    if (!milestone) continue
    const [x, z] = milestone.at
    if (current !== null && current.year === year - 1 && Math.abs(current.z - z) < 1e-6) {
      current = { minX: Math.min(current.minX, x), maxX: Math.max(current.maxX, x), z, year }
    } else {
      flush()
      current = { minX: x, maxX: x, z, year }
    }
  }
  flush()
  return pieces
}

/**
 * Le bus principal en une géométrie : chaque tronçon est un faisceau de `BUS_WIRES` fils
 * parallèles autour de sa polyligne (lacets, pentes et marches compris) ; les années sans poste
 * sont des morceaux de voie 0 **éteints** (`idle = 1`, `segmentIndex = −1`).
 */
export function busRibbons(timeline: Timeline): BusRibbons {
  const writer = new RibbonWriter()
  const segmentIndex: number[] = []
  const idle: number[] = []
  const bundle = (points: readonly Vec2[], segment: number, isIdle: 0 | 1): void => {
    for (let w = 0; w < BUS_WIRES; w++) {
      const offset = (w - (BUS_WIRES - 1) / 2) * BUS_WIRE_PITCH
      const count = writer.write(points, BUS_WIRE_WIDTH / 2, offset)
      for (let v = 0; v < count; v++) {
        segmentIndex.push(segment)
        idle.push(isIdle)
      }
    }
  }
  timeline.segments.forEach((segment, s) => {
    let points: readonly Vec2[] = segment.points
    for (const jog of timeline.jogs) if (jog.lane === segment.lane) points = withJog(points, jog)
    points = dedupe(points)
    if (points.length >= 2) bundle(points, s, 0)
  })
  for (const piece of idlePieces(timeline)) bundle(piece, -1, 1)
  return {
    ...writer.ribbons(),
    segmentIndex: new Float32Array(segmentIndex),
    idle: new Float32Array(idle),
  }
}

/**
 * Le côté de la voie 0 qui regarde hors du bus, par jalon : `−1` (vers −Z) sur les rangées
 * paires, `+1` sur les impaires — l'ordre des voies s'inverse à chaque rangée (`timeline.ts`).
 * La rangée se lit sur les données : chaque changement de Z de la voie 0 en ouvre une.
 */
export function yearSides(timeline: Timeline): readonly (1 | -1)[] {
  let row = 0
  return timeline.milestones.map((m, i) => {
    if (i > 0 && Math.abs(m.at[1] - timeline.milestones[i - 1]!.at[1]) > 1e-6) row += 1
    return row % 2 === 0 ? -1 : 1
  })
}

/* ------------------------------------------------------------------ teintes */

/** `#RRGGBB` (sRGB) → composantes **linéaires**, l'espace de travail des couleurs de three. */
export function hexToLinear(hex: string): readonly [number, number, number] {
  const channel = (offset: number): number => {
    const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return [channel(1), channel(3), channel(5)]
}

/**
 * La teinte de chaque route, dans l'ordre du plan : celle du poste pour une prise au bus, celle
 * de la puce (donc de sa famille) pour une liaison ou un tronc, la première de `TONES` à défaut.
 */
export function routeTones(plan: BoardPlan): readonly Tone[] {
  const chips = new Map(plan.zones.flatMap((z) => z.chips.map((c) => [c.slug, c.tone] as const)))
  const zones = new Map<string, Tone>(plan.zones.map((z) => [`zone:${z.family}`, z.tone]))
  const segments = new Map(plan.timeline.segments.map((s) => [s.experience, s.tone] as const))
  return plan.traces.routes.map(
    (route) =>
      (route.busLink && segments.get(route.busLink.experience)) ??
      chips.get(route.links[0]?.skill ?? '') ??
      zones.get(route.net) ??
      TONES[0],
  )
}

/* ---------------------------------------------------------------- instances */

/**
 * Les formes instanciées, **une par `InstancedMesh`**. Les géométries unitaires que la scène
 * leur donne (`board-meshes.tsx`) : boîte de côté 1 centrée (`chips`, `chipPins`, `processors`,
 * `lids`, `processorPins`, `resistors`, `terminals`), cylindre de diamètre et de hauteur 1
 * (`capacitors`, `leds`, `pads`, `milestones`), anneau plat de diamètre 1 (`vias`, `holes`),
 * carré plat de côté 1 (`glows`).
 */
export const SHAPES = [
  'chips',
  'chipPins',
  'leds',
  'processors',
  'lids',
  'processorPins',
  'resistors',
  'capacitors',
  'terminals',
  'pads',
  'vias',
  'holes',
  'milestones',
  'glows',
] as const
export type Shape = (typeof SHAPES)[number]

export interface InstanceSet {
  readonly count: number
  /** 16 flottants par instance, en colonnes — l'ordre de `Matrix4.elements`. */
  readonly matrices: Float32Array
  /** `r, g, b` linéaires par instance ; `null` pour une forme d'une seule couleur. */
  readonly colors: Float32Array | null
}

export type BoardInstances = Readonly<Record<Shape, InstanceSet>>

/** Les maillages qui ne sont pas des formes : plaque, sérigraphie, pistes, bus — dans cet ordre. */
export const FIXED_MESHES = ['plate', 'silkscreen', 'traces', 'bus'] as const
export type FixedMesh = (typeof FIXED_MESHES)[number]

/** Le plafond de §9 sur ordinateur (P8-10). */
export const MAX_DRAW_CALLS = 60

/** Cotes des formes, en unités de scène. Les tailles des boîtiers viennent du plan. */
const DIM = {
  chipPin: { pitch: 0.15, inset: 0.14, width: 0.05, height: 0.03, length: 0.12, out: 0.03 },
  cpuPin: { pitch: 0.17, inset: 0.25, width: 0.07, height: 0.04, length: 0.2, out: 0.06 },
  /** Le corps d'un processeur tient cette part de sa hauteur ; le capot, le reste. */
  cpuBody: 0.7,
  lid: 0.7,
  led: { inset: 0.15, size: 0.08, height: 0.02, glow: 0.36 },
  cpuGlow: 2.3,
  resistor: { length: 0.26, height: 0.1, depth: 0.14 },
  terminal: { offset: 0.15, length: 0.06, height: 0.105, depth: 0.15 },
  capacitor: { diameter: 0.25, height: 0.3 },
  pad: { offset: 0.17, length: 0.12, depth: 0.17, height: 0.01 },
  routePad: 0.1,
  via: { spread: 0.125, size: 0.17 },
  hole: { inset: 0.8, size: 0.62 },
  milestone: { offset: 0.42, size: 0.22, glow: 0.8 },
} as const

/** Teinte d'un jalon d'année sans poste : celle d'une piste éteinte. */
const IDLE_HEX = '#3A4658'

class InstanceWriter {
  private readonly matrices: number[] = []
  private readonly colors: number[] = []

  constructor(private readonly colored: boolean) {}

  /** Une instance : translation · rotation autour de Y (`angle`) · échelle. */
  add(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    angle = 0,
    color: readonly number[] = [1, 1, 1],
  ): void {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    this.matrices.push(c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, x, y, z, 1)
    if (this.colored) this.colors.push(color[0]!, color[1]!, color[2]!)
  }

  set(): InstanceSet {
    return {
      count: this.matrices.length / 16,
      matrices: new Float32Array(this.matrices),
      colors: this.colored ? new Float32Array(this.colors) : null,
    }
  }
}

const scaled = (rgb: readonly number[], k: number): number[] => rgb.map((v) => v * k)

/** Les positions `u` de `n` broches au pas `pitch`, centrées sur 0. */
const pinOffsets = (n: number, pitch: number): number[] =>
  Array.from({ length: n }, (_, k) => (k - (n - 1) / 2) * pitch)

/** Les broches des quatre côtés d'un boîtier carré de côté `size` centré sur `center`. */
function addPins(
  writer: InstanceWriter,
  center: Vec2,
  size: number,
  pin: (typeof DIM)['chipPin' | 'cpuPin'],
  minimum: number,
): void {
  const n = Math.max(minimum, Math.floor((size - 2 * pin.inset) / pin.pitch) + 1)
  const reach = size / 2 + pin.out
  const y = pin.height / 2
  for (const u of pinOffsets(n, pin.pitch)) {
    writer.add(center[0] + u, y, center[1] - reach, pin.width, pin.height, pin.length)
    writer.add(center[0] + u, y, center[1] + reach, pin.width, pin.height, pin.length)
    writer.add(center[0] - reach, y, center[1] + u, pin.length, pin.height, pin.width)
    writer.add(center[0] + reach, y, center[1] + u, pin.length, pin.height, pin.width)
  }
}

/** La direction (unitaire) de la piste du réseau `net` au point `at` ; l'axe X à défaut. */
function directionAt(plan: BoardPlan, net: string, at: Vec2): Vec2 {
  for (const route of plan.traces.routes) {
    if (route.net !== net) continue
    for (let i = 0; i < route.points.length - 1; i++) {
      const a = route.points[i]!
      const b = route.points[i + 1]!
      if (!samePoint(a, b) && onSegment(at, a, b)) {
        const length = Math.hypot(b[0] - a[0], b[1] - a[1])
        return [(b[0] - a[0]) / length, (b[1] - a[1]) / length]
      }
    }
  }
  return [1, 0]
}

/** Les extrémités des routes, sans doublons : les pastilles où une piste se soude. */
function routeEnds(plan: BoardPlan): Vec2[] {
  const seen = new Set<string>()
  const out: Vec2[] = []
  for (const route of plan.traces.routes) {
    for (const p of [route.points[0], route.points.at(-1)]) {
      if (!p) continue
      const key = `${Math.round(p[0] * 1000)}:${Math.round(p[1] * 1000)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(p)
    }
  }
  return out
}

/**
 * Les instances de chaque forme, au palier `tier` : la composition (puces, processeurs, vias,
 * jalons) ne change pas ; seuls les petits composants suivent `BOARD_DENSITY` — les N premiers de
 * `plan.passives`, qui est rangé dans un ordre stable par le générateur.
 */
export function instances(plan: BoardPlan, tier: DensityTier): BoardInstances {
  const w = Object.fromEntries(
    SHAPES.map((shape) => [
      shape,
      new InstanceWriter(['chips', 'leds', 'milestones', 'glows'].includes(shape)),
    ]),
  ) as Record<Shape, InstanceWriter>

  for (const chip of plan.zones.flatMap((z) => z.chips)) {
    const [x, z] = chip.center
    const tone = hexToLinear(PALETTE[chip.tone])
    w.chips.add(x, chip.height / 2, z, chip.size, chip.height, chip.size, 0, tone)
    addPins(w.chipPins, chip.center, chip.size, DIM.chipPin, 3)
    // La diode : au coin avant gauche du dessus, celui que la caméra voit.
    const lx = x - chip.size / 2 + DIM.led.inset
    const lz = z + chip.size / 2 - DIM.led.inset
    const ly = chip.height + DIM.led.height / 2
    w.leds.add(lx, ly, lz, DIM.led.size, DIM.led.height, DIM.led.size, 0, tone)
    w.glows.add(lx, chip.height + 0.004, lz, DIM.led.glow, 1, DIM.led.glow, 0, tone)
  }

  for (const cpu of plan.district.processors) {
    const [x, z] = cpu.center
    const body = cpu.height * DIM.cpuBody
    const lid = cpu.height - body
    w.processors.add(x, body / 2, z, cpu.size, body, cpu.size)
    const lidSize = cpu.size * DIM.lid
    w.lids.add(x, body + lid / 2, z, lidSize, lid, lidSize)
    addPins(w.processorPins, cpu.center, cpu.size, DIM.cpuPin, 6)
    const glow = scaled(
      hexToLinear(cpu.primary ? PALETTE.violet : PALETTE.sky),
      cpu.primary ? 1 : 0.55,
    )
    const g = cpu.size * DIM.cpuGlow
    w.glows.add(x, 0.003, z, g, 1, g, 0, glow)
  }

  const { passives } = BOARD_DENSITY[tier]
  for (const passive of plan.passives.slice(0, passives)) {
    const [x, z] = passive.center
    // Le long axe suit X, ou Z pour un composant tourné (`rotated`).
    const angle = passive.rotated ? Math.PI / 2 : 0
    const ax = passive.rotated ? 0 : 1
    const az = passive.rotated ? -1 : 0
    if (passive.kind === 'resistor') {
      const r = DIM.resistor
      w.resistors.add(x, r.height / 2, z, r.length, r.height, r.depth, angle)
      const t = DIM.terminal
      for (const side of [-1, 1]) {
        const tx = x + ax * side * t.offset
        const tz = z + az * side * t.offset
        w.terminals.add(tx, t.height / 2, tz, t.length, t.height, t.depth, angle)
      }
    } else {
      const c = DIM.capacitor
      w.capacitors.add(x, c.height / 2, z, c.diameter, c.height, c.diameter)
    }
    const p = DIM.pad
    for (const side of [-1, 1]) {
      const px = x + ax * side * p.offset
      const pz = z + az * side * p.offset
      w.pads.add(px, p.height / 2, pz, p.length, p.height, p.depth, angle)
    }
  }
  for (const [x, z] of routeEnds(plan)) {
    w.pads.add(x, DIM.pad.height / 2, z, DIM.routePad, DIM.pad.height, DIM.routePad)
  }

  // Un pont : la piste `net` plonge sous `crosses` — un via de part et d'autre, sur son axe.
  for (const via of plan.traces.vias) {
    const [dx, dz] = directionAt(plan, via.net, via.at)
    for (const side of [-1, 1]) {
      const s = DIM.via.spread * side
      w.vias.add(via.at[0] + dx * s, 0, via.at[1] + dz * s, DIM.via.size, 1, DIM.via.size)
    }
  }

  const b = plan.bounds
  const inset = DIM.hole.inset
  for (const [x, z] of [
    [b.minX + inset, b.minZ + inset],
    [b.maxX - inset, b.minZ + inset],
    [b.minX + inset, b.maxZ - inset],
    [b.maxX - inset, b.maxZ - inset],
  ] as const) {
    w.holes.add(x, 0, z, DIM.hole.size, 1, DIM.hole.size)
  }

  const sides = yearSides(plan.timeline)
  plan.timeline.milestones.forEach((m, i) => {
    const active = plan.timeline.segments.find((s) => s.startYear <= m.year && m.year <= s.endYear)
    const color = hexToLinear(active ? PALETTE[active.tone] : IDLE_HEX)
    const [x, z0] = m.at
    const z = z0 + sides[i]! * DIM.milestone.offset
    const d = DIM.milestone
    w.milestones.add(x, DIM.pad.height / 2, z, d.size, DIM.pad.height, d.size, 0, color)
    w.glows.add(x, 0.006, z, d.glow, 1, d.glow, 0, scaled(color, active ? 0.8 : 0.4))
  })

  return Object.fromEntries(SHAPES.map((shape) => [shape, w[shape].set()])) as Record<
    Shape,
    InstanceSet
  >
}

/**
 * **La** liste des maillages de la carte, dans l'ordre où `buildBoard` les monte : les maillages
 * fixes, puis un `InstancedMesh` par forme **non vide** — la scène ne monte pas une forme sans
 * instance. ⭐ `buildBoard` la parcourt et `drawCallBudget` la compte : les deux ne peuvent pas
 * diverger.
 */
export function boardMeshes(set: BoardInstances): readonly (FixedMesh | Shape)[] {
  return [...FIXED_MESHES, ...SHAPES.filter((shape) => set[shape].count > 0)]
}

/**
 * Le nombre de maillages que la scène créera (`boardMeshes`). ⚠️ `renderer.info` compte aussi les
 * passes de chaque maillage : la mesure de vérité reste `?debug=scene` (tâche 9).
 */
export function drawCallBudget(set: BoardInstances): number {
  return boardMeshes(set).length
}
