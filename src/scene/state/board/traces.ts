/**
 * Les pistes de liaison de la carte mère (P8-14f) — des puces aux processeurs,
 * et des processeurs au bus du temps (`carte-mere.md` §5, « Projets — les
 * processeurs »).
 *
 * Deux modes, et c'est le **routeur** qui choisit :
 *
 * - `direct` : une piste par couple (compétence, projet), de la puce au
 *   processeur, sur le réseau `chip:<slug>` — les pistes d'une même puce
 *   peuvent partir en éventail et partager leurs premières cellules. **Sans
 *   aucun pont** : c'est la carte la plus lisible, elle n'est retenue que si
 *   elle tient entière.
 * - `family-bus` : la parade au plat de spaghettis. Chaque zone sort par son
 *   **propre bus** (réseau `zone:<famille>`) : un tronc de `zone.exit` jusqu'au
 *   bord du quartier, de courtes pistes du tronc vers chaque processeur que la
 *   zone alimente, et une amorce de chaque puce vers la sortie de la zone. Les
 *   **ponts** y sont permis (`RoutingGrid.route`, option `bridges`).
 *
 * ⭐ Le seuil de bascule n'est pas un nombre écrit d'avance : §5 dit « quand
 * les canaux ne tiennent plus », et c'est exactement ce que mesure le routeur.
 * Si **une seule** liaison — ou un seul rattachement au bus — échoue en mode
 * direct, tout recommence sur une grille neuve en mode `family-bus`. Ce qui
 * échoue encore va dans `unrouted` / `unroutedBusLinks` — P8-15 ne le dessine
 * pas, la scène ne tombe pas.
 *
 * ⭐⭐ **Ponts.** Une seule couche sans croisement est impossible en général
 * (trois zones qui alimentent les trois mêmes processeurs forment un K3,3), et
 * §2 ne bannit que les croisements « au point de ne plus rien dire ». Un réseau
 * peut donc en franchir un autre à 90°, droit au travers d'une cellule où
 * l'autre est droit — la seconde couche d'un vrai circuit. Chaque pont est
 * déclaré dans `Traces.vias` ; hors de ces points, deux réseaux ne se touchent
 * jamais.
 *
 * Les rattachements au bus (`busLinks`, réseau `experience:<slug>`) sont
 * routés **en premier** dans les deux modes : ils sont peu nombreux, et leur
 * cible est une seule prise percée dans le bus.
 *
 * Module pur : ni `Date`, ni `Math.random`, ni Three.js. Il n'impose pas le
 * gate de contenu : une technologie inconnue, une expérience absente de la
 * frise ou une puce absente du plan sont écartées sans exception.
 */
import { type BoardContent, bySlug, compareSlugs, yearOf } from './content.ts'
import { type Bridge, type Cell, type Footprint, octile, RoutingGrid, simplify } from './grid.ts'
import { choosePrimary, type District, type Processor } from './processors.ts'
import { EPSILON, GRID, inflate, type Rect, rectOf, type Vec2 } from './rect.ts'
import { LANE_PITCH, type Timeline, yearPoint } from './timeline.ts'
import type { Zone } from './zones.ts'

type RoutingMode = 'direct' | 'family-bus'

export interface Link {
  readonly skill: string
  readonly project: string
}

interface BusLink {
  readonly project: string
  readonly experience: string
  readonly year: number
}

export interface Route {
  readonly net: string
  readonly kind: 'link' | 'trunk' | 'bus-link'
  /** Ce que la piste porte, pour le survol de P8-15 (un tronc porte toute sa zone). */
  readonly links: readonly Link[]
  /** Le rattachement que porte une route `bus-link` : le survol y retrouve le projet. */
  readonly busLink?: BusLink
  /** Polyligne octilinéaire, sommets seuls, jamais de longueur nulle. */
  readonly points: readonly Vec2[]
}

/** Un pont : en `at`, la piste du réseau `net` enjambe celle du réseau `crosses`. */
interface Via {
  readonly at: Vec2
  readonly net: string
  readonly crosses: string
}

export interface Traces {
  readonly mode: RoutingMode
  readonly links: readonly Link[]
  readonly busLinks: readonly BusLink[]
  readonly routes: readonly Route[]
  /** Toujours vide en mode `direct`. */
  readonly vias: readonly Via[]
  readonly unrouted: readonly Link[]
  readonly unroutedBusLinks: readonly BusLink[]
}

/**
 * Demi-épaisseur du bus bloqué autour de `timeline.bounds` : les voies sont
 * des lignes, la bande qui les englobe peut n'avoir aucune épaisseur (une
 * seule voie) — une cellule de chaque côté garde les pistes hors des fils.
 */
const BUS_BAND_MARGIN = GRID
/**
 * Décalage en X de la prise d'un rattachement, par voie, en cellules : deux
 * postes simultanés rattachés la même année ne percent pas la même colonne
 * (la prise de la voie 1 traverse la voie 0). Deux cellules par voie : le
 * puits d'une voie et celui de la suivante ne sont jamais adjacents.
 *
 * ⭐ Le décalage **s'enroule** dans la case (`tapShift`) : sans cela, au-delà
 * de quelques voies il sortait de la case et la voie n'avait plus aucune
 * colonne candidate — rattachement perdu.
 */
const TAP_STRIDE = 2

/** Le principal d'abord, puis par slug : l'ordre publié des projets. */
function projectOrder(content: BoardContent) {
  const primary = choosePrimary(content.projects)
  return [...content.projects].sort((a, b) =>
    a === primary ? -1 : b === primary ? 1 : compareSlugs(a.slug, b.slug),
  )
}

/**
 * Un `Link` par couple (compétence connue, projet qui la cite), dédoublonné ;
 * une technologie absente des compétences est ignorée. Ordre **publié** : le
 * principal d'abord, puis les projets par slug, les compétences par slug.
 */
export function listLinks(content: BoardContent): readonly Link[] {
  const known = new Set(content.skills.map((s) => s.slug))
  return projectOrder(content).flatMap((p) =>
    [...new Set(p.technologies)]
      .filter((t) => known.has(t))
      .sort(compareSlugs)
      .map((skill) => ({ skill, project: p.slug })),
  )
}

/** Un rattachement, avec ce que le routeur en lit : sa voie et le centre de sa prise. */
interface Tap {
  readonly bus: BusLink
  readonly lane: number
  /** Centre de la case de l'année, sur la ligne de la voie. */
  readonly at: Vec2
}

/**
 * Un rattachement par projet dont `experience` désigne un tronçon **présent
 * dans la frise** (fiche absente de la locale, gate non joué : rien, sans
 * exception). L'année est celle du début du projet, bornée à la période du
 * poste — un projet commencé avant l'embauche se branche à la première année.
 */
function listBusLinks(content: BoardContent, timeline: Timeline): readonly Tap[] {
  return projectOrder(content).flatMap((p) => {
    const segment = timeline.segments.find((s) => s.experience === p.experience)
    if (segment === undefined) return []
    const year = Math.min(segment.endYear, Math.max(segment.startYear, yearOf(p.startedAt)))
    return [
      {
        bus: { project: p.slug, experience: segment.experience, year },
        lane: segment.lane,
        at: yearPoint(timeline, year, segment.lane),
      },
    ]
  })
}

const processorRect = (p: Processor): Rect => rectOf(p.center, p.size, p.size)

/** Distance octile entre deux points : la longueur d'une piste sans obstacle. */
const distance = (a: Vec2, b: Vec2): number => octile(a[0] - b[0], a[1] - b[1])

/**
 * L'angle d'un point autour d'un centre, compté depuis l'arrière (−Z) dans le
 * sens O → arrière → E. La coupure (±π) tombe **devant** le centre, côté bus,
 * où aucune puce ne se trouve : l'ordre balaie les zones d'un seul tenant.
 */
const angleAround = (center: Vec2, p: Vec2): number =>
  Math.atan2(p[0] - center[0], center[1] - p[1])

/** Ce que le planificateur sait de chaque extrémité, indexé par slug. */
interface Endpoints {
  readonly chips: ReadonlyMap<string, { box: Rect; center: Vec2; zone: Zone }>
  readonly processors: ReadonlyMap<string, Processor>
}

/**
 * Un boîtier ne prend que les cellules dont le centre est en lui (voir
 * `Footprint` : les propriétés des pastilles en dépendent) ; il est bloqué et
 * ses pastilles sont prises avec la même empreinte.
 */
const BOX: Footprint = 'centred'

/**
 * Le point où la piste posée sur la pastille `cell` touche le **bord réel**
 * de `box` : son centre ramené dans le boîtier. Une pastille borde un côté
 * (jamais un coin), son centre n'est hors du boîtier que sur un axe : le
 * segment est orthogonal.
 */
const landing = (grid: RoutingGrid, cell: Cell, box: Rect): Vec2 => {
  const [x, z] = grid.toPoint(cell)
  return [Math.min(box.maxX, Math.max(box.minX, x)), Math.min(box.maxZ, Math.max(box.minZ, z))]
}

/** La polyligne d'un chemin de cellules, posée sur les boîtiers qu'il relie. */
function polyline(
  grid: RoutingGrid,
  cells: readonly Cell[],
  from: Rect | null,
  to: Rect | null,
): readonly Vec2[] {
  const points: Vec2[] = cells.map((c) => grid.toPoint(c))
  if (from) points.unshift(landing(grid, cells[0]!, from))
  if (to) points.push(landing(grid, cells.at(-1)!, to))
  return simplify(points)
}

/** Un chemin routé, avec ce qu'il faut pour le relâcher, le réinscrire et déclarer ses ponts. */
interface Laid {
  readonly route: Route
  readonly cells: readonly Cell[]
  readonly bridges: readonly Bridge[]
}

/** Les ponts du mode `family-bus` ; le mode `direct` route sans. */
const BRIDGED = { bridges: true } as const

/**
 * Une grille neuve : puces, processeurs et bus bloqués. Le bus l'est sur
 * toute sa bande (`timeline.bounds` : voies, rangées et `ROW_GAP` compris) —
 * seuls les rattachements y percent leur prise.
 */
function freshGrid(board: Rect, endpoints: Endpoints, timeline: Timeline) {
  const grid = new RoutingGrid(board)
  for (const chip of endpoints.chips.values()) grid.block(chip.box, BOX)
  for (const p of endpoints.processors.values()) {
    grid.block(processorRect(p), BOX)
    // Les pastilles d'un processeur restent aux pistes qui y arrivent ou en partent.
    grid.reserve(processorRect(p), BOX)
  }
  grid.block(inflate(timeline.bounds, BUS_BAND_MARGIN))
  return grid
}

/**
 * Route les rattachements au bus. La prise est sur la voie du tronçon, dans
 * la case de l'année ; pour l'atteindre, la colonne de la bande au-dessus
 * d'elle (côté quartier) est ouverte au **seul** réseau `experience:<slug>` —
 * un puits au travers des voies et des rangées qui la précèdent. Ce puits est
 * la **prise** elle-même, pas un pont : les fils du bus ne sont pas des pistes
 * routées, et la prise est l'endroit où le projet se branche. La piste finit
 * sur la ligne de la voie.
 *
 * Les colonnes candidates entourent le centre de la case, décalé de
 * `TAP_STRIDE` cellules par voie **enroulées dans la case** (`tapShift`), sans
 * sortir de la case ni de la carte ; une colonne dont une cellule est tenue
 * par une autre prise est écartée (lacet : une année de la rangée 1 tombe
 * au-dessous d'une année de la rangée 0). La prise retenue est celle que la
 * piste atteint au moindre coût. Sans colonne libre ni chemin, le
 * rattachement est rendu dans `failed`.
 *
 * Ordre : les rattachements **les plus courts d'abord** (distance du
 * processeur à sa prise) — mesuré sur le grand contenu, l'ordre publié
 * laissait des liaisons longues murer des prises proches.
 */
function routeBusLinks(
  grid: RoutingGrid,
  bridges: boolean,
  taps: readonly (Tap & { processor: Processor })[],
  timeline: Timeline,
  board: Rect,
): { laid: Laid[]; failed: BusLink[] } {
  const band = inflate(timeline.bounds, BUS_BAND_MARGIN)
  const top = grid.cellOf([0, band.minZ])[1]
  const reach = Math.floor((timeline.step / 2 - GRID) / GRID)
  const halfCell = timeline.step / 2 - GRID / 2 + EPSILON
  const shift = tapShift(halfCell)
  const laid: Laid[] = []
  const failed: BusLink[] = []
  const order = taps
    .map((tap) => ({ tap, length: distance(tap.processor.center, tap.at) }))
    .sort((a, b) => a.length - b.length)
    .map((e) => e.tap)
  for (const { bus, lane, at, processor } of order) {
    const net = `experience:${bus.experience}`
    const [x, z] = at
    const box = processorRect(processor)
    // Les colonnes candidates de la case : départ décalé par voie, ±`reach`
    // cellules — et jamais hors de la case (une demi-cellule de marge pour le
    // centre du puits).
    const shafts = new Map<number, Cell[]>()
    for (let k = -reach; k <= reach && z > board.minZ && z < board.maxZ; k += 1) {
      const cx = x + shift(lane) + k * GRID
      if (Math.abs(cx - x) > halfCell) continue
      if (cx <= board.minX || cx >= board.maxX) continue
      if (underJog(timeline, cx, z)) continue
      const [col, row] = grid.cellOf([cx, z])
      if (shaftFree(grid, col, top, row, net))
        shafts.set(
          col,
          Array.from({ length: row - top + 1 }, (_, i): Cell => [col, top + i]),
        )
    }
    // Une seule recherche vers toutes les cellules qui surplombent un puits
    // libre ; on ne perce que celui qu'elle atteint (le moins cher) : une
    // colonne sans chemin n'est jamais ouverte, la grille reste propre.
    const above = [...shafts.keys()].map((col): Cell => [col, top - 1])
    const found =
      above.length === 0 ? null : grid.route(net, grid.pads(box, net, BOX), above, { bridges })
    if (found === null) {
      failed.push(bus)
      continue
    }
    const shaft = shafts.get(found.cells.at(-1)![0])!
    for (const cell of shaft) grid.open(cell, net)
    const cells = [...found.cells, ...shaft]
    const points = [...polyline(grid, cells, box, null)]
    // La piste descend le puits jusqu'à la ligne de la voie : le dernier sommet
    // (centre de la dernière cellule) y est **ramené**, pas prolongé — la ligne
    // peut tomber dans la moitié haute de la cellule, et un point ajouté après
    // le centre ferait alors rebrousser la piste sur place.
    points[points.length - 1] = [points.at(-1)![0], z]
    laid.push({
      route: { net, kind: 'bus-link', links: [], busLink: bus, points: simplify(points) },
      cells,
      bridges: found.bridges,
    })
  }
  return { laid, failed }
}

/**
 * Vrai si un puits à l'abscisse `x`, descendant de la bande jusqu'à la ligne
 * `z`, traverserait la marche à 45° d'un changement d'employeur
 * (`timeline.jogs`). Le puits couvre en Z tout l'intervalle de la bande à `z` :
 * il coupe donc toute marche dont l'emprise en X le touche (`LANE_PITCH / 2` de
 * part et d'autre du milieu, plus la demi-cellule du puits) et dont la plus
 * petite cote Z est strictement au-dessus de `z`.
 *
 * ⛔ Une marche d'une voie **plus haute** bloque, qu'elle bombe vers −Z ou vers
 * +Z : ses deux jambes sont en travers de la colonne, et le puits les croiserait
 * (épinglé par `traces.test.ts`, « une marche d'une voie plus haute bloque »).
 * Ne gênent pas : la marche de la voie visée qui bombe vers +Z (elle est
 * au-dessous de la fin du puits, qui la touche au mieux sur la ligne), et toute
 * marche d'une rangée plus basse.
 */
export function underJog(timeline: Pick<Timeline, 'jogs'>, x: number, z: number): boolean {
  return timeline.jogs.some(
    (jog) =>
      Math.abs(x - jog.at[0]) < LANE_PITCH / 2 + GRID / 2 &&
      Math.min(...jog.points.map((p) => p[1])) < z - EPSILON,
  )
}

/**
 * Vrai si aucune cellule de la colonne `col`, des lignes `top` à `row`, n'est
 * tenue par un autre réseau que `net` — on s'arrête à la première qui l'est.
 */
function shaftFree(grid: RoutingGrid, col: number, top: number, row: number, net: string): boolean {
  for (let r = top; r <= row; r += 1) {
    const occupant = grid.occupant([col, r])
    if (occupant !== null && occupant !== net) return false
  }
  return true
}

/**
 * Le décalage en X de la prise de la voie `lane`, enroulé dans les colonnes
 * que la case offre (`halfCell` de part et d'autre de son centre) : les voies
 * successives prennent des colonnes distinctes tant qu'il en reste — le nombre
 * de colonnes est impair, un pas de deux les visite toutes avant de revenir.
 */
const tapShift =
  (halfCell: number) =>
  (lane: number): number => {
    const side = Math.floor(halfCell / GRID)
    const columns = 2 * side + 1
    return (((lane * TAP_STRIDE + side) % columns) - side) * GRID
  }

/** Les processeurs dans l'ordre de routage : le principal, puis par slug. */
function processorOrder(endpoints: Endpoints): Processor[] {
  const sorted = [...endpoints.processors.values()].sort(bySlug)
  return [...sorted.filter((p) => p.primary), ...sorted.filter((p) => !p.primary)]
}

/**
 * Mode `direct`, **sans pont**. Le routeur est **glouton, sans arrachage** :
 * l'ordre décide. Processeur par processeur (le principal d'abord), ses
 * liaisons sont routées dans l'ordre **angulaire** des puces autour de lui
 * (départage par slug). C'est un ordre planaire : deux pistes voisines en
 * angle arrivent sur des pastilles voisines de l'anneau, et une piste n'en
 * enferme jamais une autre qui partirait d'entre elle et sa voisine — l'ordre
 * alphabétique, lui, entrelace les zones et mure des pastilles. S'arrête à la
 * première liaison qui échoue (`null`) : le mode est alors perdu.
 */
function routeDirect(
  grid: RoutingGrid,
  links: readonly Link[],
  endpoints: Endpoints,
): Route[] | null {
  const routes: Route[] = []
  for (const processor of processorOrder(endpoints)) {
    const target = processorRect(processor)
    const mine = links
      .filter((l) => l.project === processor.slug)
      .map((l) => ({ link: l, chip: endpoints.chips.get(l.skill)! }))
      .map((e) => ({ ...e, angle: angleAround(processor.center, e.chip.center) }))
      .sort((a, b) => a.angle - b.angle || compareSlugs(a.link.skill, b.link.skill))
    for (const { link, chip } of mine) {
      const net = `chip:${link.skill}`
      const found = grid.route(net, grid.pads(chip.box, net, BOX), grid.pads(target, net, BOX))
      if (found === null) return null
      routes.push({
        net,
        kind: 'link',
        links: [link],
        points: polyline(grid, found.cells, chip.box, target),
      })
    }
  }
  return routes
}

/**
 * Mode `family-bus`, ponts permis, en trois passes sur toutes les zones :
 *
 * 1. **Amorces** : de la pastille de chaque puce jusqu'à la sortie de sa zone.
 *    Elles passent d'abord : routées après, elles se trouvaient coupées de
 *    leur sortie par les branches d'autres zones qui traversaient la zone
 *    entre deux étagères.
 * 2. **Troncs** : de la sortie de la zone à l'anneau qui borde le quartier.
 *    Le tronc s'arrête sur cet anneau, sans atterrir sur le bord : le
 *    quartier n'est pas bloqué, un demi-pas de plus y entrerait dans une
 *    cellule qu'un autre réseau peut tenir. Une zone dont le tronc échoue
 *    rend aussitôt les cellules de ses amorces, avant les branches.
 * 3. **Branches** : d'une cellule du tronc à la pastille du processeur, **les
 *    plus courtes d'abord** — une branche qui doit traverser le quartier (une
 *    zone de l'est qui alimente un processeur de l'ouest) n'a de chemin qu'en
 *    contournant ou en franchissant ; routée la dernière, elle contourne ce
 *    qui est posé au lieu d'enfermer les branches courtes.
 *
 * Une liaison est routée si son amorce, son tronc et sa branche le sont.
 *
 * ⭐ Chaque amorce va **jusqu'à la sortie**, chaque branche part **du tronc** :
 * jamais d'une amorce ou d'une branche voisine. Le réseau étant le même, elles
 * peuvent se superposer — mais une piste qui se grefferait sur sa voisine
 * laisserait, entre la greffe et la sortie, un tronçon dont `links` ne la
 * nomme pas : le survol (P8-15) l'allumerait avec un trou.
 */
function routeFamilyBus(
  grid: RoutingGrid,
  links: readonly Link[],
  endpoints: Endpoints,
  district: District,
): { laid: Laid[]; unrouted: Link[] } {
  const zoneOf = (l: Link) => endpoints.chips.get(l.skill)!.zone
  const groups = [...new Set(links.map(zoneOf))].map((zone) => ({
    zone,
    net: `zone:${zone.family}`,
    links: links.filter((l) => zoneOf(l) === zone),
    exit: grid.cellOf(zone.exit),
    laid: [] as Laid[],
    trunk: null as readonly Cell[] | null,
    reached: new Set<string>(),
    stubbed: new Set<string>(),
  }))

  for (const g of groups) {
    for (const skill of [...new Set(g.links.map((l) => l.skill))].sort(compareSlugs)) {
      const chip = endpoints.chips.get(skill)!
      const found = grid.route(g.net, grid.pads(chip.box, g.net, BOX), [g.exit], BRIDGED)
      if (found === null) continue
      g.stubbed.add(skill)
      const carried = g.links.filter((l) => l.skill === skill)
      g.laid.push({
        route: {
          net: g.net,
          kind: 'link',
          links: carried,
          points: polyline(grid, found.cells, chip.box, null),
        },
        ...found,
      })
    }
  }

  const districtRing = grid.cellsAround(district.bounds)
  for (const g of groups) {
    const found = grid.route(g.net, [g.exit], districtRing, BRIDGED)
    if (found === null) {
      // Sans tronc, les amorces ne mènent nulle part : leurs cellules sont rendues.
      grid.release(g.net)
      g.laid.length = 0
      continue
    }
    g.trunk = found.cells
    g.laid.push({
      route: {
        net: g.net,
        kind: 'trunk',
        links: g.links,
        points: polyline(grid, found.cells, null, null),
      },
      ...found,
    })
  }

  const processors = processorOrder(endpoints)
  const branches = groups
    .flatMap((g) =>
      g.trunk === null
        ? []
        : processors.map((processor) => ({
            g,
            trunk: g.trunk!,
            processor,
            carried: g.links.filter((l) => l.project === processor.slug),
            length: distance(grid.toPoint(g.trunk!.at(-1)!), processor.center),
          })),
    )
    .filter((b) => b.carried.length > 0)
    // `sort` est stable : à longueur égale, l'ordre des zones puis des processeurs.
    .sort((a, b) => a.length - b.length)
  for (const { g, trunk, processor, carried } of branches) {
    const target = processorRect(processor)
    const found = grid.route(g.net, trunk, grid.pads(target, g.net, BOX), BRIDGED)
    if (found === null) continue
    g.reached.add(processor.slug)
    g.laid.push({
      route: {
        net: g.net,
        kind: 'link',
        links: carried,
        points: polyline(grid, found.cells, null, target),
      },
      ...found,
    })
  }

  // Une piste ne porte que des liaisons routées de bout en bout : le survol
  // n'allume jamais un morceau de liaison perdue, et une piste qui ne porte
  // plus rien n'est ni dessinée ni gardée dans la grille (le réseau est rendu,
  // puis ses pistes gardées réinscrites).
  const unrouted = groups.flatMap((g) =>
    g.links.filter((l) => !g.stubbed.has(l.skill) || !g.reached.has(l.project)),
  )
  const lost = new Set(unrouted)
  const laid = groups.flatMap((g) => {
    const kept = g.laid
      .map((l) => ({
        ...l,
        route: { ...l.route, links: l.route.links.filter((k) => !lost.has(k)) },
      }))
      .filter((l) => l.route.links.length > 0)
    if (kept.length < g.laid.length) {
      grid.release(g.net)
      for (const l of kept) grid.claim(g.net, l.cells)
    }
    return kept
  })
  return { laid, unrouted }
}

/**
 * Les pistes, et la grille **dans son état final** (celle du mode retenu,
 * pistes occupées) : la tâche 7 y sème les petits composants sans les poser
 * sur une piste.
 */
export function planTracesWithGrid(
  content: BoardContent,
  zones: readonly Zone[],
  district: District,
  timeline: Timeline,
  board: Rect,
): { traces: Traces; grid: RoutingGrid } {
  const endpoints: Endpoints = {
    chips: new Map(
      zones.flatMap((zone) =>
        zone.chips.map((c) => [
          c.slug,
          { box: rectOf(c.center, c.size, c.size), center: c.center, zone },
        ]),
      ),
    ),
    processors: new Map(district.processors.map((p) => [p.slug, p])),
  }
  const links = listLinks(content)
  const taps = listBusLinks(content, timeline).flatMap((tap) => {
    const processor = endpoints.processors.get(tap.bus.project)
    return processor === undefined ? [] : [{ ...tap, processor }]
  })
  const busLinks = taps.map((t) => t.bus)
  // Une extrémité absente du plan (zones ou quartier d'un autre contenu) n'est
  // pas un échec de routage : elle ne fait pas basculer le mode.
  const placed = (l: Link) => endpoints.chips.has(l.skill) && endpoints.processors.has(l.project)
  const absent = links.filter((l) => !placed(l))
  const routable = links.filter(placed)

  // Mode direct : sans pont, et tout doit passer — rattachements compris.
  const first = freshGrid(board, endpoints, timeline)
  const firstBus = routeBusLinks(first, false, taps, timeline, board)
  const direct = firstBus.failed.length === 0 ? routeDirect(first, routable, endpoints) : null
  if (direct !== null) {
    return {
      traces: {
        mode: 'direct',
        links,
        busLinks,
        routes: [...firstBus.laid.map((l) => l.route), ...direct],
        vias: [],
        unrouted: absent,
        unroutedBusLinks: [],
      },
      grid: first,
    }
  }

  // Une seule liaison a échoué : tout recommence, sur une grille neuve, ponts permis.
  const grid = freshGrid(board, endpoints, timeline)
  const bus = routeBusLinks(grid, true, taps, timeline, board)
  const family = routeFamilyBus(grid, routable, endpoints, district)
  const laid = [...bus.laid, ...family.laid]
  // Un pont n'est déclaré que si la piste franchie existe encore (elle a pu
  // être abandonnée après coup) : sinon la piste passe simplement là.
  const vias = laid.flatMap((l) =>
    l.bridges
      .filter((b) => grid.occupant(b.cell) === b.crosses)
      .map((b) => ({ at: grid.toPoint(b.cell), net: l.route.net, crosses: b.crosses })),
  )
  const lost = new Set([...absent, ...family.unrouted])
  return {
    traces: {
      mode: 'family-bus',
      links,
      busLinks,
      routes: laid.map((l) => l.route),
      vias,
      unrouted: links.filter((l) => lost.has(l)),
      // Dans l’ordre publié, pas dans l’ordre de routage.
      unroutedBusLinks: busLinks.filter((b) => bus.failed.includes(b)),
    },
    grid,
  }
}

/** Les pistes seules (voir `planTracesWithGrid`). */
export function planTraces(
  content: BoardContent,
  zones: readonly Zone[],
  district: District,
  timeline: Timeline,
  board: Rect,
): Traces {
  return planTracesWithGrid(content, zones, district, timeline, board).traces
}
