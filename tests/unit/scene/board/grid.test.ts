import { describe, expect, it } from 'vitest'
import { type Cell, GRID, RoutingGrid, simplify } from '@/scene/state/board/grid'
import type { Rect, Vec2 } from '@/scene/state/board/rect'
import { expectNoCrossing, expectOctilinear } from './geometry-asserts'

const EPS = 1e-9

/** Une grille de `cols × rows` cellules, coin à l'origine. */
const gridOf = (cols: number, rows: number) =>
  new RoutingGrid({ minX: 0, minZ: 0, maxX: cols * GRID, maxZ: rows * GRID })

/** Le rectangle qui recouvre exactement les cellules `[c0..c1] × [r0..r1]`. */
const cellsRect = (c0: number, r0: number, c1: number, r1: number): Rect => ({
  minX: c0 * GRID,
  minZ: r0 * GRID,
  maxX: (c1 + 1) * GRID,
  maxZ: (r1 + 1) * GRID,
})

const key = (c: Cell) => `${c[0]},${c[1]}`

/** Deux cellules consécutives d'un chemin sont 8-adjacentes et distinctes. */
function expectConnected(path: readonly Cell[]): void {
  for (let i = 1; i < path.length; i += 1) {
    const dc = Math.abs(path[i]![0] - path[i - 1]![0])
    const dr = Math.abs(path[i]![1] - path[i - 1]![1])
    expect(Math.max(dc, dr), `pas ${i - 1}→${i}`).toBe(1)
  }
}

/** Le nombre de changements de direction le long d'un chemin. */
function turns(path: readonly Cell[]): number {
  let count = 0
  for (let i = 2; i < path.length; i += 1) {
    const a = [path[i - 1]![0] - path[i - 2]![0], path[i - 1]![1] - path[i - 2]![1]]
    const b = [path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]]
    if (a[0] !== b[0] || a[1] !== b[1]) count += 1
  }
  return count
}

describe('RoutingGrid — repère', () => {
  it('toPoint rend le centre de la cellule', () => {
    const grid = new RoutingGrid({ minX: -1, minZ: -2, maxX: 1, maxZ: 2 })
    const p = grid.toPoint([0, 0])
    expect(p[0]).toBeCloseTo(-1 + GRID / 2, 12)
    expect(p[1]).toBeCloseTo(-2 + GRID / 2, 12)
    const q = grid.toPoint([7, 15])
    expect(q[0]).toBeCloseTo(1 - GRID / 2, 12)
    expect(q[1]).toBeCloseTo(2 - GRID / 2, 12)
  })

  it('une grille neuve est libre partout, et rien hors des bornes', () => {
    const grid = gridOf(4, 3)
    expect(grid.cols).toBe(4)
    expect(grid.rows).toBe(3)
    expect(grid.isFree([0, 0])).toBe(true)
    expect(grid.isFree([3, 2])).toBe(true)
    expect(grid.isFree([4, 0])).toBe(false)
    expect(grid.isFree([0, -1])).toBe(false)
    expect(grid.occupant([0, 0])).toBeNull()
    expect(grid.occupant([9, 9])).toBeNull()
  })

  it('des bornes qui ne tombent pas sur la grille arrondissent au-dessus', () => {
    const grid = new RoutingGrid({ minX: 0, minZ: 0, maxX: 1.1, maxZ: 0.25 })
    expect(grid.cols).toBe(5)
    expect(grid.rows).toBe(1)
  })
})

describe('RoutingGrid.block', () => {
  it('bloque exactement les cellules que le rectangle recouvre (contact par un bord exclu)', () => {
    const grid = gridOf(8, 8)
    grid.block(cellsRect(2, 3, 2, 3))
    for (let c = 0; c < 8; c += 1)
      for (let r = 0; r < 8; r += 1)
        expect(grid.isFree([c, r]), `${c},${r}`).toBe(!(c === 2 && r === 3))
  })

  it('un rectangle à cheval sur des cellules les bloque toutes', () => {
    const grid = gridOf(8, 8)
    grid.block({ minX: 0.3, minZ: 0.3, maxX: 0.6, maxZ: 0.55 })
    const blocked: string[] = []
    for (let r = 0; r < 8; r += 1)
      for (let c = 0; c < 8; c += 1) if (!grid.isFree([c, r])) blocked.push(`${c},${r}`)
    expect(blocked).toEqual(['1,1', '2,1', '1,2', '2,2'])
  })

  it('un rectangle débordant est rogné aux bornes ; un rectangle dehors ne bloque rien', () => {
    const grid = gridOf(4, 4)
    grid.block({ minX: -5, minZ: -5, maxX: 0.25, maxZ: 0.25 })
    grid.block({ minX: 10, minZ: 10, maxX: 12, maxZ: 12 })
    let blocked = 0
    for (let r = 0; r < 4; r += 1)
      for (let c = 0; c < 4; c += 1) if (!grid.isFree([c, r])) blocked += 1
    expect(blocked).toBe(1)
    expect(grid.isFree([0, 0])).toBe(false)
  })
})

describe('RoutingGrid.cellsAround', () => {
  it('les huit voisines d’une cellule, en ordre ligne puis colonne', () => {
    const grid = gridOf(5, 5)
    const rect = cellsRect(2, 2, 2, 2)
    grid.block(rect)
    expect(grid.cellsAround(rect).map(key)).toEqual([
      '1,1',
      '2,1',
      '3,1',
      '1,2',
      '3,2',
      '1,3',
      '2,3',
      '3,3',
    ])
  })

  it('rognée aux bornes, et sans les cellules bloquées ou occupées', () => {
    const grid = gridOf(5, 5)
    const rect = cellsRect(0, 0, 1, 0)
    grid.block(rect)
    grid.block(cellsRect(2, 0, 2, 0))
    expect(grid.route('n', [[0, 1]], [[0, 1]])).toEqual([[0, 1]])
    expect(grid.cellsAround(rect).map(key)).toEqual(['1,1', '2,1'])
  })

  it('avec un réseau : garde aussi les cellules que ce réseau occupe déjà', () => {
    const grid = gridOf(5, 5)
    const rect = cellsRect(2, 2, 2, 2)
    grid.block(rect)
    grid.route('a', [[1, 1]], [[3, 1]])
    grid.route('b', [[1, 3]], [[1, 3]])
    expect(grid.cellsAround(rect).map(key)).toEqual(['1,2', '3,2', '2,3', '3,3'])
    expect(grid.cellsAround(rect, 'a').map(key)).toEqual(['1,1', '2,1', '3,1', '1,2', '3,2', '2,3', '3,3'])
    expect(grid.cellsAround(rect, 'inconnu').map(key)).toEqual(['1,2', '3,2', '2,3', '3,3'])
  })
})

describe('RoutingGrid.cellOf', () => {
  it('la cellule qui contient le point, rognée aux bornes', () => {
    const grid = new RoutingGrid({ minX: -1, minZ: -1, maxX: 1, maxZ: 1 })
    expect(grid.cellOf([-1 + GRID / 2, -1 + GRID / 2])).toEqual([0, 0])
    expect(grid.cellOf([0.3, -0.6])).toEqual([5, 1])
    expect(grid.cellOf([-5, 9])).toEqual([0, 7])
    // Un point posé sur une ligne de grille appartient à la cellule qui le suit.
    expect(grid.cellOf([0, 0])).toEqual([4, 4])
  })
})

describe('RoutingGrid.open', () => {
  it('rend une cellule bloquée praticable au seul réseau qui l’ouvre', () => {
    const grid = gridOf(5, 3)
    grid.block(cellsRect(2, 0, 2, 2))
    expect(grid.open([2, 1], 'a')).toBe(true)
    expect(grid.occupant([2, 1])).toBe('a')
    expect(grid.isFree([2, 1])).toBe(false)
    expect(grid.route('b', [[0, 1]], [[4, 1]])).toBeNull()
    expect(grid.route('a', [[0, 1]], [[4, 1]])).not.toBeNull()
  })

  it('refuse une cellule hors de la grille ou déjà tenue par un autre réseau', () => {
    const grid = gridOf(3, 3)
    expect(grid.open([5, 0], 'a')).toBe(false)
    grid.route('b', [[1, 1]], [[1, 1]])
    expect(grid.open([1, 1], 'a')).toBe(false)
    expect(grid.occupant([1, 1])).toBe('b')
    expect(grid.open([1, 1], 'b')).toBe(true)
  })
})

describe('RoutingGrid.landing', () => {
  it('un demi-pas vers l’empreinte : orthogonal au bord, diagonal au coin', () => {
    const grid = gridOf(5, 5)
    const rect = cellsRect(2, 2, 2, 2)
    const at = (c: Cell) => grid.landing(c, rect)
    const [cx, cz] = grid.toPoint([2, 2])
    const h = GRID / 2
    expect(at([2, 1])).toEqual([cx, cz - h])
    expect(at([3, 2])).toEqual([cx + h, cz])
    expect(at([1, 3])).toEqual([cx - h, cz + h])
    // Une cellule de l'empreinte n'a pas de bord à rejoindre : son centre.
    expect(at([2, 2])).toEqual([cx, cz])
  })
})

describe('RoutingGrid.route', () => {
  it('chemin droit sur grille vide : aucun virage, deux sommets', () => {
    const grid = gridOf(10, 10)
    const path = grid.route('a', [[0, 5]], [[9, 5]])!
    expect(path).toHaveLength(10)
    expect(turns(path)).toBe(0)
    const points = simplify(path.map((c) => grid.toPoint(c)))
    expect(points).toHaveLength(2)
    expectOctilinear(points)
  })

  it('contourne un rectangle bloqué', () => {
    const grid = gridOf(12, 12)
    grid.block(cellsRect(5, 2, 6, 9))
    const path = grid.route('a', [[1, 5]], [[10, 5]])!
    expect(path).not.toBeNull()
    expectConnected(path)
    expect(path[0]).toEqual([1, 5])
    expect(path.at(-1)).toEqual([10, 5])
    for (const cell of path)
      expect(cell[0] >= 5 && cell[0] <= 6 && cell[1] >= 2 && cell[1] <= 9).toBe(false)
    expectOctilinear(simplify(path.map((c) => grid.toPoint(c))))
  })

  it('occupe son chemin au nom de son réseau', () => {
    const grid = gridOf(6, 6)
    const path = grid.route('net-a', [[0, 0]], [[5, 0]])!
    for (const cell of path) {
      expect(grid.occupant(cell)).toBe('net-a')
      expect(grid.isFree(cell)).toBe(false)
    }
    expect(grid.occupant([0, 1])).toBeNull()
  })

  it('refuse de traverser un mur d’un autre réseau : null', () => {
    const grid = gridOf(9, 9)
    expect(grid.route('wall', [[4, 0]], [[4, 8]])).not.toBeNull()
    expect(grid.route('other', [[0, 4]], [[8, 4]])).toBeNull()
    expect(grid.occupant([0, 4])).toBeNull()
  })

  it('passe par la brèche d’un mur incomplet, sans le toucher', () => {
    const grid = gridOf(9, 9)
    grid.route('wall', [[4, 0]], [[4, 6]])
    const path = grid.route('other', [[0, 2]], [[8, 2]])!
    expect(path).not.toBeNull()
    for (const cell of path) expect(grid.occupant(cell)).toBe('other')
    expect(path.some((c) => c[1] >= 7)).toBe(true)
  })

  it('emprunte une piste de son propre réseau', () => {
    const grid = gridOf(9, 9)
    grid.route('bus', [[4, 0]], [[4, 8]])
    const path = grid.route('bus', [[0, 4]], [[8, 4]])!
    expect(path).not.toBeNull()
    expect(path.map(key)).toContain('4,4')
    expect(turns(path)).toBe(0)
  })

  it('refuse la diagonale qui croiserait une piste d’un autre réseau', () => {
    const grid = gridOf(2, 2)
    expect(grid.route('a', [[0, 0]], [[1, 1]])).toEqual([
      [0, 0],
      [1, 1],
    ])
    expect(grid.route('b', [[1, 0]], [[0, 1]])).toBeNull()
  })

  it('accepte cette diagonale si la piste enjambée est du même réseau', () => {
    const grid = gridOf(2, 2)
    grid.route('a', [[0, 0]], [[1, 1]])
    expect(grid.route('a', [[1, 0]], [[0, 1]])).toEqual([
      [1, 0],
      [0, 1],
    ])
  })

  it('ne coupe pas le coin d’un obstacle en diagonale', () => {
    const grid = gridOf(2, 2)
    grid.block(cellsRect(1, 0, 1, 0))
    const path = grid.route('a', [[0, 0]], [[1, 1]])!
    expect(path).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
    ])
  })

  it('préfère une piste droite à un escalier', () => {
    const grid = gridOf(10, 10)
    const path = grid.route('a', [[0, 0]], [[6, 2]])!
    expect(turns(path)).toBe(1)
    expect(simplify(path.map((c) => grid.toPoint(c)))).toHaveLength(3)
  })

  it('multi-sources, multi-cibles : part de la source la plus proche', () => {
    const grid = gridOf(10, 3)
    const path = grid.route(
      'a',
      [
        [0, 1],
        [5, 1],
      ],
      [
        [9, 1],
        [9, 0],
      ],
    )!
    expect(path[0]).toEqual([5, 1])
    expect(path.at(-1)).toEqual([9, 1])
    expect(turns(path)).toBe(0)
  })

  it('sources et cibles communes : la plus petite (ligne, colonne) suffit', () => {
    const grid = gridOf(5, 5)
    const path = grid.route(
      'a',
      [
        [3, 3],
        [2, 1],
        [4, 0],
      ],
      [
        [3, 3],
        [2, 1],
      ],
    )
    expect(path).toEqual([[2, 1]])
    expect(grid.occupant([2, 1])).toBe('a')
  })

  it('aucune source ou cible praticable : null, rien n’est occupé', () => {
    const grid = gridOf(5, 5)
    grid.block(cellsRect(0, 0, 0, 0))
    grid.route('other', [[4, 4]], [[4, 4]])
    expect(grid.route('a', [[0, 0]], [[3, 3]])).toBeNull()
    expect(grid.route('a', [[9, 9]], [[3, 3]])).toBeNull()
    expect(grid.route('a', [[2, 2]], [[4, 4]])).toBeNull()
    expect(grid.route('a', [], [[3, 3]])).toBeNull()
    expect(grid.occupant([2, 2])).toBeNull()
  })

  it('déterministe : mêmes appels, même chemin, quel que soit l’ordre des sources', () => {
    const run = (from: readonly Cell[]) => {
      const grid = gridOf(20, 20)
      grid.block(cellsRect(8, 4, 11, 15))
      return grid.route('a', from, [
        [19, 10],
        [19, 9],
      ])
    }
    const from: Cell[] = [
      [0, 9],
      [0, 10],
      [0, 11],
    ]
    expect(run(from)).toEqual(run(from))
    expect(run([...from].reverse())).toEqual(run(from))
  })

  it('beaucoup de réseaux sur une grille encombrée : aucun croisement', () => {
    const grid = new RoutingGrid({ minX: -12.5, minZ: -8.75, maxX: 12.5, maxZ: 8.75 })
    expect(grid.cols).toBe(100)
    expect(grid.rows).toBe(70)
    for (let i = 0; i < 6; i += 1)
      grid.block({ minX: -10 + i * 3.5, minZ: -2, maxX: -8.5 + i * 3.5, maxZ: 2 })
    const routes: { net: string; points: readonly Vec2[] }[] = []
    // 50 liaisons dans un ordre planaire (gauche → droite en haut comme en
    // bas), par éventails de trois pistes d'un même réseau.
    for (let i = 0; i < 50; i += 1) {
      const net = `n${Math.floor(i / 3)}`
      const from: Cell[] = [[i * 2, 0]]
      const to: Cell[] = [[i + 25, 69]]
      const path = grid.route(net, from, to)!
      expect(path, `liaison ${i}`).not.toBeNull()
      expectConnected(path)
      routes.push({ net, points: simplify(path.map((c) => grid.toPoint(c))) })
    }
    for (const r of routes) expectOctilinear(r.points)
    expectNoCrossing(
      routes.map((r) => r.points),
      (i) => routes[i]!.net,
    )
  })
})

describe('simplify', () => {
  it('ne garde que les sommets', () => {
    const pts: Vec2[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 1],
      [4, 2],
      [4, 3],
    ]
    expect(simplify(pts)).toEqual([
      [0, 0],
      [2, 0],
      [4, 2],
      [4, 3],
    ])
  })

  it('retire les doublons, laisse intacts les cas courts', () => {
    expect(simplify([])).toEqual([])
    expect(simplify([[1, 1]])).toEqual([[1, 1]])
    expect(
      simplify([
        [0, 0],
        [0, 0],
        [1, 0],
        [1, 0],
      ]),
    ).toEqual([
      [0, 0],
      [1, 0],
    ])
    expect(
      simplify([
        [0, 0],
        [0, 0],
      ]),
    ).toEqual([[0, 0]])
  })

  it('tolère le bruit flottant d’un pas de grille', () => {
    const pts: Vec2[] = [0, 1, 2, 3].map((i) => [0.1 + i * GRID, 0.3 + i * GRID] as const)
    const out = simplify(pts)
    expect(out).toHaveLength(2)
    expect(Math.abs(out[1]![0] - (0.1 + 3 * GRID))).toBeLessThan(EPS)
  })

  it('un aller-retour garde son point de rebroussement', () => {
    expect(
      simplify([
        [0, 0],
        [2, 0],
        [1, 0],
      ]),
    ).toEqual([
      [0, 0],
      [2, 0],
      [1, 0],
    ])
  })
})
