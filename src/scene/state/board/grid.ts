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
 * `RoutingGrid` garde un état mutable (obstacles, occupants) : c'est la
 * mémoire de travail du routeur, elle ne sort jamais dans les données du plan.
 *
 * Module pur : ni `Date`, ni `Math.random`, ni Three.js.
 */
import type { Rect, Vec2 } from './rect'

/** Pas de la grille du routeur. */
export const GRID = 0.25

export type Cell = readonly [col: number, row: number]

/** Tolérance flottante : un bord posé sur une ligne de grille ne déborde pas sur la voisine. */
const EPSILON = 1e-9
/** Pénalité d'un changement de direction : des pistes droites, pas des escaliers. */
const TURN_COST = 0.5

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
  private readonly nets: string[] = []
  private readonly netIds = new Map<string, number>()

  /** Les bornes sont couvertes entièrement : une cellule partielle au bord compte. */
  constructor(bounds: Rect) {
    this.bounds = bounds
    this.cols = Math.max(0, Math.ceil((bounds.maxX - bounds.minX) / GRID - EPSILON))
    this.rows = Math.max(0, Math.ceil((bounds.maxZ - bounds.minZ) / GRID - EPSILON))
    this.blocked = new Uint8Array(this.cols * this.rows)
    this.occupants = new Int32Array(this.cols * this.rows)
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
   * Les cellules **libres** (ni bloquées ni occupées) 8-adjacentes à
   * l'empreinte de `rect`, hors de l'empreinte elle-même — les pastilles
   * possibles d'une piste qui part de ce rectangle. Ordre ligne puis colonne.
   */
  cellsAround(rect: Rect): readonly Cell[] {
    const { c0, c1, r0, r1 } = this.footprint(rect)
    const out: Cell[] = []
    for (let r = r0 - 1; r <= r1 + 1; r += 1) {
      for (let c = c0 - 1; c <= c1 + 1; c += 1) {
        const onRing = r < r0 || r > r1 || c < c0 || c > c1
        if (onRing && this.isFree([c, r])) out.push([c, r])
      }
    }
    return out
  }

  /** Le réseau qui occupe la cellule ; `null` si elle est inoccupée ou hors de la grille. */
  occupant(cell: Cell): string | null {
    if (!this.inside(cell[0], cell[1])) return null
    const id = this.occupants[cell[1] * this.cols + cell[0]]!
    return id === 0 ? null : this.nets[id - 1]!
  }

  /** Vrai si la cellule est dans la grille, non bloquée et inoccupée. */
  isFree(cell: Cell): boolean {
    if (!this.inside(cell[0], cell[1])) return false
    const i = cell[1] * this.cols + cell[0]
    return this.blocked[i] === 0 && this.occupants[i] === 0
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

  /** Une piste du réseau `id` peut-elle se poser sur la cellule d'indice `i` ? */
  private passable(i: number, id: number): boolean {
    const o = this.occupants[i]!
    return this.blocked[i] === 0 && (o === 0 || o === id)
  }

  /** Les indices des cellules praticables par `id`, dédoublonnés et triés (ligne, colonne). */
  private passableIndices(cells: readonly Cell[], id: number): number[] {
    const set = new Set<number>()
    for (const [c, r] of cells) {
      if (!this.inside(c, r)) continue
      const i = r * this.cols + c
      if (this.passable(i, id)) set.add(i)
    }
    return [...set].sort((a, b) => a - b)
  }

  /**
   * La piste la moins chère du réseau `net` d'une cellule de `from` à une
   * cellule de `to` — A* multi-sources (toutes à coût 0), multi-cibles, huit
   * directions. Le chemin trouvé est **occupé** par `net` ; `null` si aucun.
   *
   * - Une cellule est franchissable si elle n'est pas bloquée et si son
   *   occupant est `null` ou `net` : les pistes d'un même réseau se rejoignent
   *   (éventail, bus).
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
    const id = this.netId(net)
    const sources = this.passableIndices(from, id)
    const targets = this.passableIndices(to, id)
    if (sources.length === 0 || targets.length === 0) return null

    const isTarget = new Uint8Array(this.cols * this.rows)
    for (const t of targets) isTarget[t] = 1
    const shared = sources.find((s) => isTarget[s] === 1)
    if (shared !== undefined) return this.occupy([shared], id)

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
    const heuristic = (c: number, r: number): number => {
      const dx = Math.max(0, tc0 - c, c - tc1)
      const dz = Math.max(0, tr0 - r, r - tr1)
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)
    }

    const stateCount = this.cols * this.rows * STATES_PER_CELL
    const cost = new Float64Array(stateCount).fill(Infinity)
    const parent = new Int32Array(stateCount).fill(-1)
    const closed = new Uint8Array(stateCount)
    const heap = new MinHeap()
    for (const s of sources) {
      const state = s * STATES_PER_CELL + NO_DIR
      cost[state] = 0
      const c = s % cols
      heap.push(state, heuristic(c, (s - c) / cols))
    }

    while (heap.size > 0) {
      const state = heap.pop()
      if (closed[state] === 1) continue
      closed[state] = 1
      const cell = Math.floor(state / STATES_PER_CELL)
      if (isTarget[cell] === 1) return this.occupy(this.unwind(parent, state), id)
      const dir = state % STATES_PER_CELL
      const c = cell % cols
      const r = (cell - c) / cols
      for (let d = 0; d < DIRS.length; d += 1) {
        const [dc, dr] = DIRS[d]!
        const nc = c + dc
        const nr = r + dr
        if (!this.inside(nc, nr)) continue
        const next = nr * cols + nc
        if (!this.passable(next, id)) continue
        const diagonal = dc !== 0 && dr !== 0
        if (diagonal && !(this.passable(r * cols + nc, id) && this.passable(nr * cols + c, id)))
          continue
        const step = (diagonal ? Math.SQRT2 : 1) + (dir !== NO_DIR && dir !== d ? TURN_COST : 0)
        const nextState = next * STATES_PER_CELL + d
        const g = cost[state]! + step
        if (g < cost[nextState]!) {
          cost[nextState] = g
          parent[nextState] = state
          heap.push(nextState, g + heuristic(nc, nr))
        }
      }
    }
    return null
  }

  /** Les indices de cellules du chemin, de la source à `state`. */
  private unwind(parent: Int32Array, state: number): number[] {
    const cells: number[] = []
    for (let s = state; s !== -1; s = parent[s]!) cells.push(Math.floor(s / STATES_PER_CELL))
    return cells.reverse()
  }

  /** Inscrit le chemin au nom du réseau `id` et le rend en cellules. */
  private occupy(indices: readonly number[], id: number): readonly Cell[] {
    return indices.map((i) => {
      this.occupants[i] = id
      const c = i % this.cols
      return [c, (i - c) / this.cols] as const
    })
  }
}

/** Tolérance de colinéarité, à l'échelle d'une carte en unités de scène. */
const COLLINEAR_EPSILON = 1e-9

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
