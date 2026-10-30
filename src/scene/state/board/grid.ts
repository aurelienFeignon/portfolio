/**
 * Le routeur sur grille de la carte mère — les pistes entre puces, processeurs
 * et bus (`carte-mere.md` §5, « Projets », anti-spaghetti).
 *
 * La carte est découpée en cellules carrées de `GRID` de côté. Une piste est
 * une suite de cellules 8-adjacentes ; rendue en polyligne (centres des
 * cellules, sommets seuls après `simplify`), chacun de ses segments est
 * horizontal, vertical ou à 45°.
 *
 * Repère : la cellule `[col, row]` a pour centre
 * `[bounds.minX + (col + 0.5) · GRID, bounds.minZ + (row + 0.5) · GRID]` —
 * la colonne suit X, la ligne suit Z.
 *
 * `RoutingGrid` garde un état mutable (obstacles, occupants, ponts) : c'est la
 * mémoire de travail du routeur, elle ne sort jamais dans les données du plan.
 *
 * **Ponts** (`routeBridged`) — la seconde couche d'un vrai circuit. Une piste
 * peut franchir un **autre** réseau, et seulement ainsi : à 90° exactement,
 * droit au travers d'**une** cellule de cet autre réseau, dont la piste est
 * elle-même droite (orthogonale) dans cette cellule ; elle y entre et en ressort
 * dans le même alignement. Jamais deux ponts sur des cellules consécutives,
 * jamais sur une cellule où l'autre réseau tourne, s'arrête ou se ramifie. Un
 * pont coûte `BRIDGE_COST` : le routeur ne le prend que faute de mieux. Une
 * cellule franchie n'est plus praticable pour personne (ni franchissable une
 * seconde fois).
 *
 * Module pur : ni `Date`, ni `Math.random`, ni Three.js.
 */
import type { Rect, Vec2 } from './rect.ts'

/** Pas de la grille du routeur. */
export const GRID = 0.25

export type Cell = readonly [col: number, row: number]

/** Tolérance flottante : un bord posé sur une ligne de grille ne déborde pas sur la voisine. */
const EPSILON = 1e-9
/** Pénalité d'un changement de direction : des pistes droites, pas des escaliers. */
const TURN_COST = 0.5
/**
 * Surcoût d'un pont, en pas de piste : un détour de moins de quatre cellules
 * passe avant un franchissement. Mesuré sur le grand contenu (20 projets) :
 * à 8 ou 12, les détours qu'il préfère finissent par murer une prise du bus
 * (une liaison au bus perdue) ; à 4, tout passe. Assez cher pour qu'un pont
 * ne remplace pas un contournement court, assez bas pour qu'un réseau ne
 * fasse pas le tour de la carte plutôt que d'enjamber une piste.
 */
export const BRIDGE_COST = 4

/**
 * Surcoût d'un pas sur une cellule qui **longe** un autre réseau (une voisine
 * orthogonale lui appartient). Deux pistes de réseaux différents collées l'une
 * à l'autre ne se franchissent plus (jamais deux ponts consécutifs) : un
 * faisceau serré est un mur. Ce surcoût les écarte d'une cellule dès que la
 * place le permet, sans interdire les couloirs étroits entre deux puces.
 */
export const HUG_COST = 1

/**
 * Forme d'une piste dans une cellule qu'elle occupe : `STRAIGHT_X` et
 * `STRAIGHT_Z` sont les seules franchissables par un pont (droite selon X ou
 * selon Z) ; `OTHER` couvre virage, diagonale, extrémité, ramification et
 * prise du bus.
 */
const SHAPE_NONE = 0
const SHAPE_STRAIGHT_X = 1
const SHAPE_STRAIGHT_Z = 2
const SHAPE_OTHER = 3

/** Un pont posé par `routeBridged` : la cellule franchie et le réseau qu'elle porte. */
export interface Bridge {
  readonly cell: Cell
  readonly crosses: string
}

/**
 * Les huit directions, dans un ordre fixe (l'indice sert d'identifiant). La
 * neuvième « direction » (`NO_DIR`) est celle d'une source : aucun pas n'y
 * mène, son premier pas ne paie donc aucun virage.
 */
const DIRS: readonly (readonly [dc: number, dr: number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]
const NO_DIR = DIRS.length
const STATES_PER_CELL = DIRS.length + 1

/**
 * Tas binaire minimal sur des identifiants d'état, ordonné par `(f, id)`.
 * L'identifiant code `(ligne, colonne, direction)` dans cet ordre : à `f`
 * égal, le tas départage donc par ligne puis colonne — le routeur reste
 * déterministe sans dépendre de l'ordre d'insertion.
 */
class MinHeap {
  private readonly ids: number[] = []
  private readonly keys: number[] = []

  get size(): number {
    return this.ids.length
  }

  private less(i: number, j: number): boolean {
    const a = this.keys[i]!
    const b = this.keys[j]!
    return a < b || (a === b && this.ids[i]! < this.ids[j]!)
  }

  private swap(i: number, j: number): void {
    ;[this.ids[i], this.ids[j]] = [this.ids[j]!, this.ids[i]!]
    ;[this.keys[i], this.keys[j]] = [this.keys[j]!, this.keys[i]!]
  }

  push(id: number, key: number): void {
    this.ids.push(id)
    this.keys.push(key)
    let i = this.ids.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (!this.less(i, parent)) break
      this.swap(i, parent)
      i = parent
    }
  }

  /** Retire et rend le plus petit identifiant (le tas ne doit pas être vide). */
  pop(): number {
    const top = this.ids[0]!
    const lastId = this.ids.pop()!
    const lastKey = this.keys.pop()!
    if (this.ids.length > 0) {
      this.ids[0] = lastId
      this.keys[0] = lastKey
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.ids.length && this.less(l, m)) m = l
        if (r < this.ids.length && this.less(r, m)) m = r
        if (m === i) break
        this.swap(i, m)
        i = m
      }
    }
    return top
  }
}

export class RoutingGrid {
  readonly cols: number
  readonly rows: number
  private readonly bounds: Rect
  private readonly blocked: Uint8Array
  /** Indice + 1 du réseau occupant dans `nets` ; 0 = cellule inoccupée. */
  private readonly occupants: Int32Array
  /** Forme de la piste de l'occupant dans la cellule (`SHAPE_*`). */
  private readonly shapes: Uint8Array
  /** Indice + 1 du réseau qui a franchi la cellule par un pont ; 0 = aucun. */
  private readonly bridged: Int32Array
  /** 1 si la cellule est réservée aux pistes qui y partent ou y arrivent (`reserve`). */
  private readonly reserved: Uint8Array
  private readonly nets: string[] = []
  private readonly netIds = new Map<string, number>()

  /**
   * Mémoire de travail de l'A*, réutilisée d'un appel à l'autre : une valeur
   * n'est valide que si son tampon vaut la génération de l'appel en cours —
   * pas de réallocation ni de remise à zéro de toute la grille à chaque piste.
   */
  private readonly cost: Float64Array
  private readonly parent: Int32Array
  private readonly stamp: Uint32Array
  private readonly closedStamp: Uint32Array
  /** 1 si l'état a été atteint par un pont (la cellule enjambée est entre lui et son parent). */
  private readonly viaStep: Uint8Array
  private readonly targetStamp: Uint32Array
  private readonly sourceStamp: Uint32Array
  private generation = 0

  /** Les bornes sont couvertes entièrement : une cellule partielle au bord compte. */
  constructor(bounds: Rect) {
    this.bounds = bounds
    this.cols = Math.max(0, Math.ceil((bounds.maxX - bounds.minX) / GRID - EPSILON))
    this.rows = Math.max(0, Math.ceil((bounds.maxZ - bounds.minZ) / GRID - EPSILON))
    const cells = this.cols * this.rows
    this.blocked = new Uint8Array(cells)
    this.occupants = new Int32Array(cells)
    this.shapes = new Uint8Array(cells)
    this.bridged = new Int32Array(cells)
    this.reserved = new Uint8Array(cells)
    const states = cells * STATES_PER_CELL
    this.cost = new Float64Array(states)
    this.parent = new Int32Array(states)
    this.stamp = new Uint32Array(states)
    this.closedStamp = new Uint32Array(states)
    this.viaStep = new Uint8Array(states)
    this.targetStamp = new Uint32Array(cells)
    this.sourceStamp = new Uint32Array(cells)
  }

  private inside(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows
  }

  /**
   * Les cellules que `rect` recouvre d'une surface non nulle, rognées aux
   * bornes : `[c0..c1] × [r0..r1]` (vide si `c1 < c0` ou `r1 < r0`). Un bord
   * posé exactement sur une ligne de grille ne déborde pas sur la voisine.
   */
  private footprint(rect: Rect): { c0: number; c1: number; r0: number; r1: number } {
    const { minX, minZ } = this.bounds
    return {
      c0: Math.max(0, Math.floor((rect.minX - minX) / GRID + EPSILON)),
      c1: Math.min(this.cols - 1, Math.ceil((rect.maxX - minX) / GRID - EPSILON) - 1),
      r0: Math.max(0, Math.floor((rect.minZ - minZ) / GRID + EPSILON)),
      r1: Math.min(this.rows - 1, Math.ceil((rect.maxZ - minZ) / GRID - EPSILON) - 1),
    }
  }

  /**
   * Interdit à toute piste chaque cellule que `rect` recouvre (au sens de
   * `footprint` : toute cellule touchée par l'intérieur du rectangle — rien de
   * ce qui est bloqué ne laisse une piste passer sous une puce).
   */
  block(rect: Rect): void {
    const { c0, c1, r0, r1 } = this.footprint(rect)
    for (let r = r0; r <= r1; r += 1)
      for (let c = c0; c <= c1; c += 1) this.blocked[r * this.cols + c] = 1
  }

  /**
   * Réserve l'anneau (coins compris) autour de l'empreinte de `rect` : une
   * piste n'y entre que si elle y part ou y arrive (cellule de `from` ou de
   * `to`). Sans cela, la piste la plus courte **longe** le boîtier et prend,
   * une à une, toutes ses pastilles — un processeur se retrouvait ceinturé
   * par la liaison au bus d'un voisin, et plus rien ne l'atteignait.
   */
  reserve(rect: Rect): void {
    const { c0, c1, r0, r1 } = this.footprint(rect)
    for (let r = r0 - 1; r <= r1 + 1; r += 1)
      for (let c = c0 - 1; c <= c1 + 1; c += 1)
        if ((r < r0 || r > r1 || c < c0 || c > c1) && this.inside(c, r))
          this.reserved[r * this.cols + c] = 1
  }

  /** Praticable par le réseau d'identifiant `own` (`undefined` : par personne d'occupé). */
  private openTo(i: number, own: number | undefined): boolean {
    const o = this.occupants[i]!
    return this.blocked[i] === 0 && this.bridged[i] === 0 && (o === 0 || o === own)
  }

  /**
   * Les cellules **libres** (ni bloquées ni occupées) 8-adjacentes à
   * l'empreinte de `rect`, hors de l'empreinte elle-même. Ordre ligne puis
   * colonne. Avec `net`, les cellules que ce réseau occupe déjà comptent aussi.
   */
  cellsAround(rect: Rect, net?: string): readonly Cell[] {
    return this.ring(rect, net, true)
  }

  /**
   * Les **pastilles** de `rect` : comme `cellsAround`, sans les quatre coins —
   * une pastille borde un côté, et la piste qui en part rejoint le bord par un
   * segment orthogonal. Avec `net`, la deuxième piste d'une puce peut repartir
   * de l'anneau que la première a pris (éventail).
   */
  pads(rect: Rect, net?: string): readonly Cell[] {
    return this.ring(rect, net, false)
  }

  private ring(rect: Rect, net: string | undefined, corners: boolean): readonly Cell[] {
    const { c0, c1, r0, r1 } = this.footprint(rect)
    const own = net === undefined ? undefined : this.netIds.get(net)
    const out: Cell[] = []
    for (let r = r0 - 1; r <= r1 + 1; r += 1) {
      for (let c = c0 - 1; c <= c1 + 1; c += 1) {
        const outRow = r < r0 || r > r1
        const outCol = c < c0 || c > c1
        if (!(outRow || outCol) || (!corners && outRow && outCol) || !this.inside(c, r)) continue
        if (this.openTo(r * this.cols + c, own)) out.push([c, r])
      }
    }
    return out
  }

  /**
   * La cellule qui contient `point`, rognée aux bornes. Un point posé sur une
   * ligne de grille appartient à la cellule qui la suit.
   */
  cellOf(point: Vec2): Cell {
    const { minX, minZ } = this.bounds
    const clamp = (v: number, n: number) => Math.min(n - 1, Math.max(0, v))
    return [
      clamp(Math.floor((point[0] - minX) / GRID + EPSILON), this.cols),
      clamp(Math.floor((point[1] - minZ) / GRID + EPSILON), this.rows),
    ]
  }

  /**
   * Ouvre la cellule au **seul** réseau `net` : elle n'est plus bloquée et
   * `net` l'occupe, donc aucune autre piste n'y passe (c'est la prise d'un
   * tronçon du bus, percée pour un rattachement). Une prise n'est jamais
   * franchissable par un pont. Rend `false` — sans rien changer — si la
   * cellule est hors de la grille ou tenue par un autre réseau.
   */
  open(cell: Cell, net: string): boolean {
    if (!this.inside(cell[0], cell[1])) return false
    const i = cell[1] * this.cols + cell[0]
    const id = this.netId(net)
    if (this.occupants[i] !== 0 && this.occupants[i] !== id) return false
    this.blocked[i] = 0
    this.occupants[i] = id
    this.shapes[i] = SHAPE_OTHER
    return true
  }

  /**
   * Rend libres toutes les cellules qu'occupe `net` — une piste abandonnée ne
   * garde pas sa place. Les ponts déjà posés restent : une cellule franchie
   * n'est jamais rendue.
   */
  release(net: string): void {
    const id = this.netIds.get(net)
    if (id === undefined) return
    for (let i = 0; i < this.occupants.length; i += 1) {
      if (this.occupants[i] === id) {
        this.occupants[i] = 0
        this.shapes[i] = SHAPE_NONE
      }
    }
  }

  /**
   * Réinscrit un chemin au nom de `net` (après `release`, pour les pistes que
   * l'on garde). Les cellules que `net` a franchies par un pont restent à leur
   * réseau.
   */
  claim(net: string, cells: readonly Cell[]): void {
    const id = this.netId(net)
    this.occupy(
      cells.map(([c, r]) => r * this.cols + c),
      id,
    )
  }

  /** Le réseau qui occupe la cellule ; `null` si elle est inoccupée ou hors de la grille. */
  occupant(cell: Cell): string | null {
    if (!this.inside(cell[0], cell[1])) return null
    const id = this.occupants[cell[1] * this.cols + cell[0]]!
    return id === 0 ? null : this.nets[id - 1]!
  }

  /** Vrai si la cellule est dans la grille, non bloquée, inoccupée et non franchie. */
  isFree(cell: Cell): boolean {
    if (!this.inside(cell[0], cell[1])) return false
    return this.openTo(cell[1] * this.cols + cell[0], undefined)
  }

  /** Le centre de la cellule (voir le repère en tête du module). */
  toPoint(cell: Cell): Vec2 {
    return [this.bounds.minX + (cell[0] + 0.5) * GRID, this.bounds.minZ + (cell[1] + 0.5) * GRID]
  }

  private netId(net: string): number {
    let id = this.netIds.get(net)
    if (id === undefined) {
      this.nets.push(net)
      id = this.nets.length
      this.netIds.set(net, id)
    }
    return id
  }

  /** Les indices des cellules praticables par `id`, dédoublonnés et triés (ligne, colonne). */
  private passableIndices(cells: readonly Cell[], id: number): number[] {
    const set = new Set<number>()
    for (const [c, r] of cells) {
      if (!this.inside(c, r)) continue
      const i = r * this.cols + c
      if (this.openTo(i, id)) set.add(i)
    }
    return [...set].sort((a, b) => a - b)
  }

  /**
   * La piste la moins chère du réseau `net` d'une cellule de `from` à une
   * cellule de `to` — A* multi-sources (toutes à coût 0), multi-cibles, huit
   * directions, **sans pont**. Le chemin trouvé est **occupé** par `net` ;
   * `null` si aucun.
   *
   * - Une cellule est franchissable si elle n'est ni bloquée ni franchie par un
   *   pont, et si son occupant est `null` ou `net` : les pistes d'un même
   *   réseau se rejoignent (éventail, bus).
   * - Une diagonale est refusée si l'une des deux cellules orthogonales
   *   qu'elle enjambe appartient à un **autre** réseau (c'est ce qui interdit
   *   les croisements en X) ou est bloquée (une piste ne rase pas le coin
   *   d'une puce).
   * - Coût : 1 par pas orthogonal, √2 par diagonale, +0,5 par changement de
   *   direction. Heuristique octile vers le rectangle englobant des cibles
   *   (admissible et cohérente : elle minore la distance à toute cible).
   * - Égalités départagées par (coût, ligne, colonne) : le résultat ne dépend
   *   pas de l'ordre de `from` ni de `to`.
   * - Les cellules impraticables de `from` / `to` sont ignorées ; si `from` et
   *   `to` partagent une cellule, la piste est cette seule cellule (la plus
   *   petite en (ligne, colonne)).
   */
  route(net: string, from: readonly Cell[], to: readonly Cell[]): readonly Cell[] | null {
    return this.search(net, from, to, false)?.cells ?? null
  }

  /**
   * Comme `route`, avec des **ponts** (voir l'en-tête du module) : un pas
   * orthogonal peut enjamber une cellule d'un autre réseau dont la piste y est
   * droite et perpendiculaire, pour retomber sur la cellule suivante, dans le
   * même alignement, à `2 + BRIDGE_COST`. Rend le chemin (cellules franchies
   * comprises, dans l'ordre) et les ponts posés.
   */
  routeBridged(
    net: string,
    from: readonly Cell[],
    to: readonly Cell[],
  ): { cells: readonly Cell[]; bridges: readonly Bridge[] } | null {
    return this.search(net, from, to, true)
  }

  private search(
    net: string,
    from: readonly Cell[],
    to: readonly Cell[],
    bridges: boolean,
  ): { cells: readonly Cell[]; bridges: readonly Bridge[] } | null {
    const id = this.netId(net)
    const sources = this.passableIndices(from, id)
    const targets = this.passableIndices(to, id)
    if (sources.length === 0 || targets.length === 0) return null

    this.generation += 1
    const gen = this.generation
    for (const t of targets) this.targetStamp[t] = gen
    for (const t of sources) this.sourceStamp[t] = gen
    const isTarget = (cell: number) => this.targetStamp[cell] === gen
    /** Une cellule réservée n'est praticable qu'en départ ou en arrivée. */
    const admitted = (cell: number) =>
      this.reserved[cell] === 0 || isTarget(cell) || this.sourceStamp[cell] === gen
    const shared = sources.find(isTarget)
    if (shared !== undefined) return this.lay([shared], [], id)

    const cols = this.cols
    let tc0 = Infinity
    let tc1 = -Infinity
    let tr0 = Infinity
    let tr1 = -Infinity
    for (const t of targets) {
      const c = t % cols
      const r = (t - c) / cols
      tc0 = Math.min(tc0, c)
      tc1 = Math.max(tc1, c)
      tr0 = Math.min(tr0, r)
      tr1 = Math.max(tr1, r)
    }
    const heuristic = (c: number, r: number): number =>
      octile(Math.max(0, tc0 - c, c - tc1), Math.max(0, tr0 - r, r - tr1))

    const { cost, parent, stamp, closedStamp, viaStep } = this
    const heap = new MinHeap()
    const relax = (state: number, from: number, g: number, c: number, r: number, via: number) => {
      if (stamp[state] === gen && g >= cost[state]!) return
      stamp[state] = gen
      cost[state] = g
      parent[state] = from
      viaStep[state] = via
      heap.push(state, g + heuristic(c, r))
    }
    for (const s of sources) {
      const c = s % cols
      relax(s * STATES_PER_CELL + NO_DIR, -1, 0, c, (s - c) / cols, 0)
    }

    while (heap.size > 0) {
      const state = heap.pop()
      if (closedStamp[state] === gen) continue
      closedStamp[state] = gen
      const cell = Math.floor(state / STATES_PER_CELL)
      if (isTarget(cell)) return this.lay(...this.unwind(state), id)
      const dir = state % STATES_PER_CELL
      const c = cell % cols
      const r = (cell - c) / cols
      const g0 = cost[state]!
      for (let d = 0; d < DIRS.length; d += 1) {
        const [dc, dr] = DIRS[d]!
        const nc = c + dc
        const nr = r + dr
        if (!this.inside(nc, nr)) continue
        const next = nr * cols + nc
        const turn = dir !== NO_DIR && dir !== d ? TURN_COST : 0
        const diagonal = dc !== 0 && dr !== 0
        if (this.openTo(next, id)) {
          if (!admitted(next)) continue
          if (diagonal && !(this.openTo(r * cols + nc, id) && this.openTo(nr * cols + c, id)))
            continue
          const g = g0 + (diagonal ? Math.SQRT2 : 1) + turn + this.hug(nc, nr, id)
          relax(next * STATES_PER_CELL + d, state, g, nc, nr, 0)
        } else if (bridges && !diagonal && this.bridgeable(next, dc !== 0, id)) {
          const fc = nc + dc
          const fr = nr + dr
          if (!this.inside(fc, fr)) continue
          const landing = fr * cols + fc
          if (!this.openTo(landing, id) || !admitted(landing)) continue
          const g = g0 + 2 + BRIDGE_COST + turn + this.hug(fc, fr, id)
          relax(landing * STATES_PER_CELL + d, state, g, fc, fr, 1)
        }
      }
    }
    return null
  }

  /** `HUG_COST` si une voisine orthogonale de `(c, r)` appartient à un autre réseau. */
  private hug(c: number, r: number, id: number): number {
    const { cols, occupants } = this
    const i = r * cols + c
    const other = (j: number) => {
      const o = occupants[j]!
      return o !== 0 && o !== id
    }
    const near =
      (c > 0 && other(i - 1)) ||
      (c < cols - 1 && other(i + 1)) ||
      (r > 0 && other(i - cols)) ||
      (r < this.rows - 1 && other(i + cols))
    return near ? HUG_COST : 0
  }

  /**
   * La cellule `i` peut-elle être enjambée par `id`, qui avance selon X
   * (`alongX`) ou selon Z ? Il faut un autre occupant, non bloqué, pas encore
   * franchi, dont la piste y est droite et **perpendiculaire** au pas.
   */
  private bridgeable(i: number, alongX: boolean, id: number): boolean {
    const o = this.occupants[i]!
    if (o === 0 || o === id || this.blocked[i] === 1 || this.bridged[i] !== 0) return false
    return this.shapes[i] === (alongX ? SHAPE_STRAIGHT_Z : SHAPE_STRAIGHT_X)
  }

  /** Les indices de cellules du chemin, de la source à `state`, et ceux des cellules franchies. */
  private unwind(state: number): [number[], number[]] {
    const cells: number[] = []
    const crossed: number[] = []
    for (let s = state; s !== -1; s = this.parent[s]!) {
      const cell = Math.floor(s / STATES_PER_CELL)
      cells.push(cell)
      if (this.viaStep[s] === 1) {
        const before = Math.floor(this.parent[s]! / STATES_PER_CELL)
        const mid = (cell + before) / 2
        cells.push(mid)
        crossed.push(mid)
      }
    }
    return [cells.reverse(), crossed.reverse()]
  }

  /** Inscrit le chemin et ses ponts au nom de `id`, et le rend en cellules. */
  private lay(
    indices: readonly number[],
    crossed: readonly number[],
    id: number,
  ): { cells: readonly Cell[]; bridges: readonly Bridge[] } {
    const bridges = crossed.map((i) => {
      this.bridged[i] = id
      return { cell: this.cellAt(i), crosses: this.nets[this.occupants[i]! - 1]! }
    })
    this.occupy(indices, id)
    return { cells: indices.map((i) => this.cellAt(i)), bridges }
  }

  private cellAt(i: number): Cell {
    const c = i % this.cols
    return [c, (i - c) / this.cols] as const
  }

  /**
   * Inscrit les cellules au nom de `id`, avec la forme de la piste dans
   * chacune — sauf celles que `id` franchit par un pont, qui restent à leur
   * réseau. Une cellule déjà tenue par `id` sous une autre forme devient
   * `OTHER` (ramification) : on ne fait pas un pont sur une jonction.
   */
  private occupy(indices: readonly number[], id: number): void {
    const cols = this.cols
    indices.forEach((i, k) => {
      if (this.bridged[i] === id) return
      const prev = indices[k - 1]
      const next = indices[k + 1]
      let shape = SHAPE_OTHER
      if (prev !== undefined && next !== undefined && next - i === i - prev) {
        const step = i - prev
        if (step === 1 || step === -1) shape = SHAPE_STRAIGHT_X
        else if (step === cols || step === -cols) shape = SHAPE_STRAIGHT_Z
      }
      if (this.occupants[i] === id && this.shapes[i] !== shape) shape = SHAPE_OTHER
      this.occupants[i] = id
      this.shapes[i] = shape
    })
  }
}

/** Tolérance de colinéarité, à l'échelle d'une carte en unités de scène. */
const COLLINEAR_EPSILON = 1e-9

/**
 * Distance octile pour des écarts `dx`, `dz` : la longueur du plus court chemin
 * à pas droits et diagonaux, sans obstacle.
 */
export const octile = (dx: number, dz: number): number => {
  const ax = Math.abs(dx)
  const az = Math.abs(dz)
  return Math.max(ax, az) + (Math.SQRT2 - 1) * Math.min(ax, az)
}

/**
 * Ne garde que les sommets d'une polyligne : un point est retiré s'il double
 * son prédécesseur, ou s'il prolonge le segment précédent dans le **même
 * sens** (un rebroussement reste un sommet).
 */
export function simplify(points: readonly Vec2[]): readonly Vec2[] {
  const out: Vec2[] = []
  for (const p of points) {
    const last = out.at(-1)
    if (
      last &&
      Math.abs(p[0] - last[0]) < COLLINEAR_EPSILON &&
      Math.abs(p[1] - last[1]) < COLLINEAR_EPSILON
    )
      continue
    const prev = out.at(-2)
    if (prev && last) {
      const ax = last[0] - prev[0]
      const az = last[1] - prev[1]
      const bx = p[0] - last[0]
      const bz = p[1] - last[1]
      if (Math.abs(ax * bz - az * bx) < COLLINEAR_EPSILON && ax * bx + az * bz > 0) {
        out[out.length - 1] = p
        continue
      }
    }
    out.push(p)
  }
  return out
}
