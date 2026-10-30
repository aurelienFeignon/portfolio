/**
 * Les pistes de liaison de la carte mère (P8-14f) — des puces aux processeurs,
 * et des processeurs au bus du temps (`carte-mere.md` §5, « Projets — les
 * processeurs »).
 *
 * Deux modes, et c'est le **routeur** qui choisit :
 *
 * - `direct` : une piste par couple (compétence, projet), de la puce au
 *   processeur, sur le réseau `chip:<slug>` — les pistes d'une même puce
 *   peuvent partir en éventail et partager leurs premières cellules.
 * - `family-bus` : la parade au plat de spaghettis. Chaque zone sort par son
 *   **propre bus** (réseau `zone:<famille>`) : un tronc de `zone.exit` jusqu'au
 *   bord du quartier, de courtes pistes du tronc vers chaque processeur que la
 *   zone alimente, et une amorce de chaque puce vers la sortie de la zone.
 *
 * ⭐ Le seuil de bascule n'est pas un nombre écrit d'avance : §5 dit « quand
 * les canaux ne tiennent plus », et c'est exactement ce que mesure le routeur.
 * Si **une seule** liaison échoue en mode direct, tout recommence sur une
 * grille neuve en mode `family-bus`. Ce qui échoue encore va dans `unrouted`
 * — P8-15 ne le dessine pas, la scène ne tombe pas.
 *
 * Les rattachements au bus (`busLinks`, réseau `experience:<slug>`) sont
 * routés **en premier** dans les deux modes : ils sont peu nombreux, et leur
 * cible est une seule prise percée dans le bus.
 *
 * Module pur : ni `Date`, ni `Math.random`, ni Three.js. Il n'impose pas le
 * gate de contenu : une technologie inconnue, une expérience absente de la
 * frise ou une puce absente du plan sont écartées sans exception.
 */
import { type BoardContent, yearOf } from './content'
import { type Cell, GRID, RoutingGrid, simplify } from './grid'
import { choosePrimary, type District, type Processor } from './processors'
import { inflate, type Rect, rectOf, type Vec2 } from './rect'
import { type Timeline, yearPoint } from './timeline'
import type { Zone } from './zones'

export type RoutingMode = 'direct' | 'family-bus'

export interface Link {
  readonly skill: string
  readonly project: string
}

export interface BusLink {
  readonly project: string
  readonly experience: string
  readonly year: number
}

export interface Route {
  readonly net: string
  readonly kind: 'link' | 'trunk' | 'bus-link'
  /** Ce que la piste porte, pour le survol de P8-15 (un tronc porte toute sa zone). */
  readonly links: readonly Link[]
  /** Polyligne octilinéaire, sommets seuls, jamais de longueur nulle. */
  readonly points: readonly Vec2[]
}

export interface Traces {
  readonly mode: RoutingMode
  readonly links: readonly Link[]
  readonly busLinks: readonly BusLink[]
  readonly routes: readonly Route[]
  readonly unrouted: readonly Link[]
}

/**
 * Demi-épaisseur du bus bloqué autour de `timeline.bounds` : les voies sont
 * des lignes, la bande qui les englobe peut n'avoir aucune épaisseur (une
 * seule voie) — une cellule de chaque côté garde les pistes hors des fils.
 */
const BUS_CLEARANCE = GRID
/**
 * Débord toléré d'un boîtier sur une cellule libre. `block` interdit toute
 * cellule que le boîtier effleure : posées hors de la grille, deux puces à
 * `CHIP_GAP` (deux pas) ne laissaient alors qu'**un** couloir d'une cellule
 * entre elles — une seule piste, quand le mode direct en exige deux. Bloquer
 * le boîtier rétréci d'un quart de pas rend toujours ≥ 2 cellules à un écart
 * de deux pas, et le centre d'une cellule libre reste à ≥ ¼ de pas du boîtier.
 */
const PAD_TOLERANCE = GRID / 4
/**
 * Décalage en X de la prise d'un rattachement, par voie : deux postes
 * simultanés rattachés la même année ne percent pas la même colonne (la
 * prise de la voie 1 traverse la voie 0). Deux cellules par voie : le
 * puits d'une voie et celui de la suivante ne sont jamais adjacents.
 */
const TAP_SHIFT = 2 * GRID

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** Le principal d'abord, puis par slug : l'ordre publié des projets. */
function projectOrder(content: BoardContent) {
  const primary = choosePrimary(content.projects)
  return [...content.projects].sort((a, b) =>
    a === primary ? -1 : b === primary ? 1 : compare(a.slug, b.slug),
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
      .sort(compare)
      .map((skill) => ({ skill, project: p.slug })),
  )
}

/**
 * Un rattachement par projet dont `experience` désigne un tronçon **présent
 * dans la frise** (fiche absente de la locale, gate non joué : rien, sans
 * exception). L'année est celle du début du projet, bornée à la période du
 * poste — un projet commencé avant l'embauche se branche à la première année.
 */
function listBusLinks(content: BoardContent, timeline: Timeline): readonly BusLink[] {
  return projectOrder(content).flatMap((p) => {
    const segment = timeline.segments.find((s) => s.experience === p.experience)
    if (segment === undefined) return []
    const year = Math.min(segment.endYear, Math.max(segment.startYear, yearOf(p.startedAt)))
    return [{ project: p.slug, experience: segment.experience, year }]
  })
}

const processorRect = (p: Processor): Rect => rectOf(p.center, p.size, p.size)

/**
 * L'angle d'un point autour d'un centre, compté depuis l'arrière (−Z) dans le
 * sens O → arrière → E. La coupure (±π) tombe **devant** le centre, côté bus,
 * où aucune puce ne se trouve : l'ordre balaie les zones d'un seul tenant.
 */
const angleAround = (center: Vec2, p: Vec2): number =>
  Math.atan2(p[0] - center[0], center[1] - p[1])

/** Ce que le planificateur sait de chaque extrémité, indexé par slug. */
interface Endpoints {
  readonly chips: ReadonlyMap<string, { rect: Rect; center: Vec2; zone: Zone }>
  readonly processors: ReadonlyMap<string, Processor>
}

/** La polyligne d'un chemin de cellules, posée sur les rectangles qu'il relie. */
function polyline(
  grid: RoutingGrid,
  cells: readonly Cell[],
  from: Rect | null,
  to: Rect | null,
): readonly Vec2[] {
  // ⭐ Les atterrissages (`landing`) restent dans la cellule d'extrémité : ils
  // ne coupent aucune autre piste, et une route d'une seule cellule (source et
  // cible adjacentes) garde une longueur non nulle — jamais un point isolé.
  const points: Vec2[] = cells.map((c) => grid.toPoint(c))
  if (from) points.unshift(grid.landing(cells[0]!, from))
  if (to) points.push(grid.landing(cells.at(-1)!, to))
  return simplify(points)
}

/**
 * Une grille neuve : puces, processeurs et bus bloqués. Le bus l'est sur
 * toute sa bande (`timeline.bounds` : voies, rangées et `ROW_GAP` compris) —
 * seuls les rattachements y percent leur prise.
 */
function freshGrid(board: Rect, endpoints: Endpoints, timeline: Timeline) {
  const grid = new RoutingGrid(board)
  for (const chip of endpoints.chips.values()) grid.block(inflate(chip.rect, -PAD_TOLERANCE))
  for (const p of endpoints.processors.values())
    grid.block(inflate(processorRect(p), -PAD_TOLERANCE))
  grid.block(inflate(timeline.bounds, BUS_CLEARANCE))
  return grid
}

/**
 * Route les rattachements au bus. La prise est sur la voie du tronçon, dans
 * la case de l'année ; pour l'atteindre, la colonne de la bande au-dessus
 * d'elle (côté quartier) est ouverte au **seul** réseau `experience:<slug>` —
 * un puits au travers des voies et des rangées qui la précèdent, comme un via.
 *
 * La colonne part du centre de la case, décalée de `TAP_SHIFT` par voie ; si
 * une autre prise tient déjà une de ses cellules (lacet : une année de la
 * rangée 1 tombe au-dessous d'une année de la rangée 0), la prise glisse
 * d'une cellule à droite, puis à gauche, et ainsi de suite sans sortir de la
 * case — et aussi quand le puits est libre mais que rien n'y mène. Sans
 * colonne libre ni chemin, ce rattachement — et lui seul — n'est pas dessiné.
 */
function routeBusLinks(
  grid: RoutingGrid,
  busLinks: readonly BusLink[],
  endpoints: Endpoints,
  timeline: Timeline,
  board: Rect,
): Route[] {
  const band = inflate(timeline.bounds, BUS_CLEARANCE)
  const top = grid.cellOf([0, band.minZ])[1]
  const reach = Math.floor((timeline.step / 2 - GRID) / GRID)
  const routes: Route[] = []
  for (const bus of busLinks) {
    const segment = timeline.segments.find((s) => s.experience === bus.experience)!
    const net = `experience:${bus.experience}`
    const [x, z] = yearPoint(timeline, bus.year, segment.lane)
    const rect = processorRect(endpoints.processors.get(bus.project)!)
    const free = (cell: Cell) => grid.occupant(cell) === null || grid.occupant(cell) === net
    const inBoard = z > board.minZ && z < board.maxZ
    for (let i = 0; i <= 2 * reach && inBoard; i += 1) {
      // 0, +1, −1, +2, −2… cellules autour de la colonne de départ.
      const cx = x + segment.lane * TAP_SHIFT + (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2) * GRID
      if (cx <= board.minX || cx >= board.maxX) continue
      const [col, row] = grid.cellOf([cx, z])
      const shaft = Array.from({ length: row - top + 1 }, (_, k): Cell => [col, top + k])
      if (!shaft.every(free)) continue
      // On route jusqu'à la cellule qui surplombe le puits, puis on perce : une
      // colonne sans chemin n'est jamais ouverte, la grille reste propre.
      const cells = grid.route(net, grid.cellsAround(rect, net), [[col, top - 1]])
      if (cells === null) continue
      for (const cell of shaft) grid.open(cell, net)
      const path = [...cells, ...shaft]
      routes.push({ net, kind: 'bus-link', links: [], points: polyline(grid, path, rect, null) })
      break
    }
  }
  return routes
}

/** Les processeurs dans l'ordre de routage : le principal, puis par slug. */
function processorOrder(endpoints: Endpoints): Processor[] {
  const bySlug = [...endpoints.processors.values()].sort((a, b) => compare(a.slug, b.slug))
  return [...bySlug.filter((p) => p.primary), ...bySlug.filter((p) => !p.primary)]
}

/**
 * Mode `direct`. Le routeur est **glouton, sans arrachage** : l'ordre décide.
 * Processeur par processeur (le principal d'abord), ses liaisons sont routées
 * dans l'ordre **angulaire** des puces autour de lui (départage par slug).
 * C'est un ordre planaire : deux pistes voisines en angle arrivent sur des
 * pastilles voisines de l'anneau, et une piste n'en enferme jamais une autre
 * qui partirait d'entre elle et sa voisine — l'ordre alphabétique, lui,
 * entrelace les zones et mure des pastilles. S'arrête à la première liaison
 * qui échoue (`null`) : le mode est alors perdu.
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
      .sort((a, b) => a.angle - b.angle || compare(a.link.skill, b.link.skill))
    for (const { link, chip } of mine) {
      const net = `chip:${link.skill}`
      const cells = grid.route(net, grid.cellsAround(chip.rect, net), grid.cellsAround(target, net))
      if (cells === null) return null
      routes.push({
        net,
        kind: 'link',
        links: [link],
        points: polyline(grid, cells, chip.rect, target),
      })
    }
  }
  return routes
}

/** Distance octile entre deux points : la longueur d'une piste sans obstacle. */
const octile = (a: Vec2, b: Vec2): number => {
  const dx = Math.abs(a[0] - b[0])
  const dz = Math.abs(a[1] - b[1])
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)
}

/**
 * Mode `family-bus`, en trois passes sur toutes les zones :
 *
 * 1. **Amorces** : de l'anneau de chaque puce jusqu'à la sortie de sa zone.
 *    Elles passent d'abord : routées après, elles se trouvaient coupées de
 *    leur sortie par les branches d'autres zones qui traversaient la zone
 *    entre deux étagères.
 * 2. **Troncs** : de la sortie de la zone à l'anneau qui borde le quartier,
 *    posés sur le bord du quartier.
 * 3. **Branches** : d'une cellule du tronc à l'anneau du processeur, **les plus courtes
 *    d'abord** — une branche qui doit traverser le quartier (une zone de
 *    l'est qui alimente un processeur de l'ouest) n'a de chemin qu'en
 *    contournant ; routée la dernière, elle contourne ce qui est posé au lieu
 *    d'enfermer les branches courtes, qui n'ont qu'un chemin.
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
) {
  const routes: Route[] = []
  const zoneOf = (l: Link) => endpoints.chips.get(l.skill)!.zone
  const groups = [...new Set(links.map(zoneOf))].map((zone) => ({
    zone,
    net: `zone:${zone.family}`,
    links: links.filter((l) => zoneOf(l) === zone),
    exit: grid.cellOf(zone.exit),
    trunk: [] as Cell[],
    reached: new Set<string>(),
    stubbed: new Set<string>(),
  }))

  for (const g of groups) {
    for (const skill of [...new Set(g.links.map((l) => l.skill))].sort(compare)) {
      const chip = endpoints.chips.get(skill)!
      const cells = grid.route(g.net, grid.cellsAround(chip.rect, g.net), [g.exit])
      if (cells === null) continue
      g.stubbed.add(skill)
      const carried = g.links.filter((l) => l.skill === skill)
      routes.push({
        net: g.net,
        kind: 'link',
        links: carried,
        points: polyline(grid, cells, chip.rect, null),
      })
    }
  }

  const districtRing = grid.cellsAround(district.bounds)
  for (const g of groups) {
    const cells = grid.route(g.net, [g.exit], districtRing)
    if (cells === null) continue
    g.trunk.push(...cells)
    routes.push({
      net: g.net,
      kind: 'trunk',
      links: g.links,
      points: polyline(grid, cells, null, district.bounds),
    })
  }

  const branches = groups
    .filter((g) => g.trunk.length > 0)
    .flatMap((g) =>
      processorOrder(endpoints)
        .map((processor) => ({
          g,
          processor,
          carried: g.links.filter((l) => l.project === processor.slug),
          length: octile(grid.toPoint(g.trunk.at(-1)!), processor.center),
        }))
        .filter((b) => b.carried.length > 0),
    )
    // `sort` est stable : à longueur égale, l'ordre des zones puis des processeurs.
    .sort((a, b) => a.length - b.length)
  for (const { g, processor, carried } of branches) {
    const target = processorRect(processor)
    const cells = grid.route(g.net, g.trunk, grid.cellsAround(target, g.net))
    if (cells === null) continue
    g.reached.add(processor.slug)
    routes.push({
      net: g.net,
      kind: 'link',
      links: carried,
      points: polyline(grid, cells, null, target),
    })
  }

  const unrouted = groups.flatMap((g) =>
    g.links.filter((l) => !g.stubbed.has(l.skill) || !g.reached.has(l.project)),
  )
  // Une piste ne porte que des liaisons routées de bout en bout : le survol
  // n'allume jamais un morceau de liaison perdue, et une piste qui ne porte
  // plus rien n'est pas dessinée (ses cellules restent prises dans la grille).
  const lost = new Set(unrouted)
  const kept = routes
    .map((r) => ({ ...r, links: r.links.filter((l) => !lost.has(l)) }))
    .filter((r) => r.links.length > 0)
  return { routes: kept, unrouted }
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
          { rect: rectOf(c.center, c.size, c.size), center: c.center, zone },
        ]),
      ),
    ),
    processors: new Map(district.processors.map((p) => [p.slug, p])),
  }
  const links = listLinks(content)
  const busLinks = listBusLinks(content, timeline).filter((b) =>
    endpoints.processors.has(b.project),
  )
  // Une extrémité absente du plan (zones ou quartier d'un autre contenu) n'est
  // pas un échec de routage : elle ne fait pas basculer le mode.
  const placed = (l: Link) => endpoints.chips.has(l.skill) && endpoints.processors.has(l.project)
  const absent = links.filter((l) => !placed(l))
  const routable = links.filter(placed)

  /** Une grille neuve et ses rattachements au bus, routés en premier. */
  const start = () => {
    const grid = freshGrid(board, endpoints, timeline)
    return { grid, busRoutes: routeBusLinks(grid, busLinks, endpoints, timeline, board) }
  }

  const first = start()
  const direct = routeDirect(first.grid, routable, endpoints)
  if (direct !== null) {
    return {
      traces: {
        mode: 'direct',
        links,
        busLinks,
        routes: [...first.busRoutes, ...direct],
        unrouted: absent,
      },
      grid: first.grid,
    }
  }
  // Une seule liaison a échoué : tout recommence, sur une grille neuve.
  const second = start()
  const bus = routeFamilyBus(second.grid, routable, endpoints, district)
  const lost = new Set([...absent, ...bus.unrouted])
  return {
    traces: {
      mode: 'family-bus',
      links,
      busLinks,
      routes: [...second.busRoutes, ...bus.routes],
      unrouted: links.filter((l) => lost.has(l)),
    },
    grid: second.grid,
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
