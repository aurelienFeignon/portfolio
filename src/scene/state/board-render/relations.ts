/**
 * Les **relations** de la carte mère (P8-15f, `carte-mere.md` §8) : ce qu'un survol allume, où
 * mène un clic, et quelle cible se trouve sous le pointeur.
 *
 * - survol d'une **puce** : elle, ses pistes, les processeurs qu'elle alimente ;
 * - survol d'un **processeur** : ses compétences, ses pistes, son tronçon de bus ;
 * - survol d'une **année** : les employeurs de l'année, les projets qui y sont rattachés ;
 * - survol d'un **tronçon** : son employeur, ses projets, les années qu'il couvre.
 *
 * ⭐ Le rendu n'en tire que des **niveaux** (un flottant par instance, un par sommet de ruban) :
 * la mise en relief passe par des attributs, jamais par un matériau par piste (§9).
 *
 * Les cibles elles-mêmes, et où mène un clic, vivent dans `targets.ts` : `SceneMount` les lit
 * depuis le chemin de première visite, qui ne doit tirer ni `layout.ts` ni la géométrie.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import { BUS_WIRES } from '../layout.ts'
import type { BoardPlan } from '../board/plan.ts'
import type { Vec2 } from '../board/rect.ts'
import type { BoardFile } from './file-format.ts'
import { BUS_WIRE_PITCH, type Shape, withJog } from './geometry.ts'
import type { BoardTarget } from './targets.ts'

export type { BoardTarget } from './targets.ts'

/** Ce qu'une cible allume ; tout le reste s'atténue. */
export interface Relations {
  /** Slugs des puces (compétences). */
  readonly chips: ReadonlySet<string>
  /** Slugs des processeurs (projets). */
  readonly processors: ReadonlySet<string>
  /** Indices dans `plan.traces.routes` — l'attribut `routeIndex` des pistes. */
  readonly routes: ReadonlySet<number>
  /** Expériences dont le tronçon du bus s'allume. */
  readonly segments: ReadonlySet<string>
  /** Années dont le jalon s'allume. */
  readonly years: ReadonlySet<number>
}

/** Les indices des routes qui satisfont `test`. */
function routesWhere(
  plan: BoardPlan,
  test: (route: BoardPlan['traces']['routes'][number]) => boolean,
): Set<number> {
  const out = new Set<number>()
  plan.traces.routes.forEach((route, i) => {
    if (test(route)) out.add(i)
  })
  return out
}

/** Ce qu'allume le survol de `target` (§8). */
export function relationsOf(file: BoardFile, target: BoardTarget): Relations {
  const { plan } = file
  const { links, busLinks } = plan.traces
  switch (target.kind) {
    case 'chip': {
      const slug = target.slug
      return {
        chips: new Set([slug]),
        processors: new Set(links.filter((l) => l.skill === slug).map((l) => l.project)),
        routes: routesWhere(plan, (r) => r.links.some((l) => l.skill === slug)),
        segments: new Set(),
        years: new Set(),
      }
    }
    case 'processor': {
      const slug = target.slug
      return {
        chips: new Set(links.filter((l) => l.project === slug).map((l) => l.skill)),
        processors: new Set([slug]),
        routes: routesWhere(
          plan,
          (r) => r.links.some((l) => l.project === slug) || r.busLink?.project === slug,
        ),
        segments: new Set(busLinks.filter((b) => b.project === slug).map((b) => b.experience)),
        years: new Set(),
      }
    }
    case 'year': {
      const year = target.year
      const attached = busLinks.filter((b) => b.year === year)
      return {
        chips: new Set(),
        processors: new Set(attached.map((b) => b.project)),
        routes: routesWhere(plan, (r) => r.busLink?.year === year),
        segments: new Set(
          plan.timeline.segments
            .filter((s) => s.startYear <= year && year <= s.endYear)
            .map((s) => s.experience),
        ),
        years: new Set([year]),
      }
    }
    case 'segment': {
      const experience = target.experience
      const spans = plan.timeline.segments.filter((s) => s.experience === experience)
      return {
        chips: new Set(),
        processors: new Set(
          busLinks.filter((b) => b.experience === experience).map((b) => b.project),
        ),
        routes: routesWhere(plan, (r) => r.busLink?.experience === experience),
        segments: new Set([experience]),
        years: new Set(
          plan.timeline.milestones
            .map((m) => m.year)
            .filter((y) => spans.some((s) => s.startYear <= y && y <= s.endYear)),
        ),
      }
    }
  }
}

/**
 * La cible d'une instance touchée par le lancer de rayon. L'ordre des instances est celui de
 * `instances` : une puce (corps, diode, lueur de diode) par puce du plan ; un processeur (corps,
 * capot) par processeur ; un jalon par année — et les lueurs, dans cet ordre : puces,
 * processeurs, jalons. Les autres formes (broches, passifs…) ne désignent rien.
 */
export function targetOfInstance(
  plan: BoardPlan,
  shape: Shape,
  instanceId: number | undefined,
): BoardTarget | null {
  if (instanceId === undefined) return null
  const chips = plan.zones.flatMap((z) => z.chips)
  const { processors } = plan.district
  const { milestones } = plan.timeline
  const chipAt = (i: number): BoardTarget | null => {
    const chip = chips[i]
    return chip ? { kind: 'chip', slug: chip.slug } : null
  }
  const processorAt = (i: number): BoardTarget | null => {
    const cpu = processors[i]
    return cpu ? { kind: 'processor', slug: cpu.slug } : null
  }
  const yearAt = (i: number): BoardTarget | null => {
    const m = milestones[i]
    return m ? { kind: 'year', year: m.year } : null
  }
  switch (shape) {
    case 'chips':
    case 'leds':
      return chipAt(instanceId)
    case 'processors':
    case 'lids':
      return processorAt(instanceId)
    case 'milestones':
      return yearAt(instanceId)
    case 'glows':
      if (instanceId < chips.length) return chipAt(instanceId)
      if (instanceId < chips.length + processors.length)
        return processorAt(instanceId - chips.length)
      return yearAt(instanceId - chips.length - processors.length)
    default:
      return null
  }
}

/** Demi-largeur du faisceau du bus, plus une marge pour le pointeur. */
const BUS_REACH = (BUS_WIRES * BUS_WIRE_PITCH) / 2 + 0.1
/** Rayon autour d'un point d'année où le pointeur désigne l'année plutôt que le tronçon. */
const YEAR_REACH = 0.3

/** Distance du point (x, z) à la polyligne `points`. */
function distanceToPath(points: readonly Vec2[], x: number, z: number): number {
  let best = Infinity
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1]!
    const [bx, bz] = points[i]!
    const dx = bx - ax
    const dz = bz - az
    const length2 = dx * dx + dz * dz
    // Un sommet répété (marche) donne une arête nulle : `t` vaut alors 0, sans division par zéro.
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / Math.max(length2, 1e-12)))
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)))
  }
  return best
}

/**
 * La cible du bus sous un point du plan (x, z) : une année près de son jalon, sinon le tronçon le
 * plus proche à portée du faisceau. ⭐ Le bus est fin et plat : plutôt que des boîtes de sélection
 * (un maillage de plus au budget), la scène lit le point touché sur la plaque et le confie ici.
 */
export function targetAtPoint(plan: BoardPlan, x: number, z: number): BoardTarget | null {
  const { timeline } = plan
  for (const m of timeline.milestones) {
    if (Math.hypot(x - m.at[0], z - m.at[1]) <= YEAR_REACH) return { kind: 'year', year: m.year }
  }
  let best: { experience: string; distance: number } | null = null
  for (const segment of timeline.segments) {
    let points: readonly Vec2[] = segment.points
    for (const jog of timeline.jogs) if (jog.lane === segment.lane) points = withJog(points, jog)
    const distance = distanceToPath(points, x, z)
    if (distance <= BUS_REACH && (best === null || distance < best.distance)) {
      best = { experience: segment.experience, distance }
    }
  }
  return best === null ? null : { kind: 'segment', experience: best.experience }
}

/** Les niveaux d'allumage : sans survol, au survol pour ce qui s'allume, pour le reste. */
// Des valeurs exactes en flottant 32 bits : les tampons les portent telles quelles.
export const LEVEL = { neutral: 1, lit: 1.375, dim: 0.25 } as const

/** Les formes dont les instances portent un niveau. */
export type LitShape = 'chips' | 'leds' | 'processors' | 'lids' | 'milestones' | 'glows'

/** Le niveau de chaque instance des formes désignables ; tout au neutre sans `relations`. */
export function instanceLevels(
  plan: BoardPlan,
  relations: Relations | null,
): Readonly<Record<LitShape, Float32Array>> {
  const level = (lit: boolean): number =>
    relations === null ? LEVEL.neutral : lit ? LEVEL.lit : LEVEL.dim
  const chips = plan.zones
    .flatMap((z) => z.chips)
    .map((c) => level(relations?.chips.has(c.slug) ?? false))
  const processors = plan.district.processors.map((p) =>
    level(relations?.processors.has(p.slug) ?? false),
  )
  const milestones = plan.timeline.milestones.map((m) =>
    level(relations?.years.has(m.year) ?? false),
  )
  return {
    chips: new Float32Array(chips),
    leds: new Float32Array(chips),
    processors: new Float32Array(processors),
    lids: new Float32Array(processors),
    milestones: new Float32Array(milestones),
    glows: new Float32Array([...chips, ...processors, ...milestones]),
  }
}

/**
 * Le niveau de chaque sommet d'un ruban, lu dans son indice d'élément (`routeIndex` des pistes,
 * `segmentIndex` du bus, −1 pour un morceau éteint) ; écrit dans `out`, sans allocation.
 */
export function ribbonLevels(
  index: Float32Array,
  lit: ReadonlySet<number> | null,
  out: Float32Array,
): Float32Array {
  for (let v = 0; v < index.length; v++) {
    out[v] = lit === null ? LEVEL.neutral : lit.has(index[v]!) ? LEVEL.lit : LEVEL.dim
  }
  return out
}

/** Les indices, dans `timeline.segments`, des tronçons qu'allument `relations`. */
export function litSegments(plan: BoardPlan, relations: Relations): ReadonlySet<number> {
  const out = new Set<number>()
  plan.timeline.segments.forEach((s, i) => {
    if (relations.segments.has(s.experience)) out.add(i)
  })
  return out
}
