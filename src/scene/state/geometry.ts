/**
 * Les deux géométries que `three` ne fournit pas, construites en **données pures**.
 *
 * Aucun import de `three`, aucun JSX : ce module se teste sans contexte WebGL, et
 * c'est ce qui permet de vérifier par assertion des propriétés qu'aucun rendu ne
 * montre — l'étanchéité d'un solide, l'orientation de ses faces.
 *
 * Repère : centré sur l'origine pour la boîte, posé sur `y = 0` pour le capuchon.
 * Unités en mètres. Les tableaux rendus se versent tels quels dans un
 * `BufferGeometry`.
 */

export interface Mesh {
  /** Trois nombres par sommet. */
  readonly positions: readonly number[]
  /** Trois indices par triangle. */
  readonly indices: readonly number[]
}

/** Les huit signes de coin, dans un ordre stable. */
const CORNERS: readonly (readonly [number, number, number])[] = [
  [-1, -1, -1],
  [-1, -1, 1],
  [-1, 1, -1],
  [-1, 1, 1],
  [1, -1, -1],
  [1, -1, 1],
  [1, 1, -1],
  [1, 1, 1],
]

/**
 * ⭐⭐ **L'orientation n'est pas écrite à la main, elle est CALCULÉE.**
 *
 * Les deux solides construits ici sont convexes et contiennent leur centre : la
 * bonne normale d'un triangle est donc celle qui **s'éloigne** de ce centre, et
 * trois soustractions suffisent à retourner ceux qui sont à l'envers. Le dossier
 * de scène rapporte que **22 des 44 triangles** de la boîte chanfreinée étaient
 * mal orientés à la première écriture — un défaut qui ne se voit qu'à l'œil, sur
 * un rendu, une fois la scène montée.
 */
function orienter(
  positions: readonly number[],
  triangle: readonly [number, number, number],
  interieur: readonly [number, number, number],
): [number, number, number] {
  /*
   * ⭐ `slice` plutôt qu'une lecture indexée avec repli. Sous
   * `noUncheckedIndexedAccess`, `positions[i]` vaut `number | undefined`, et le
   * `?? 0` qu'il impose est une branche **inatteignable** — les indices viennent
   * d'ici même. Une branche inatteignable n'est pas seulement inutile : elle fait
   * tomber la porte de couverture, qui a raison de la compter. Relevé par la CI.
   */
  const point = (index: number): [number, number, number] =>
    positions.slice(index * 3, index * 3 + 3) as [number, number, number]

  const [a, b, c] = [point(triangle[0]), point(triangle[1]), point(triangle[2])]
  const ab: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac: [number, number, number] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const normale: [number, number, number] = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ]
  const sortant: [number, number, number] = [
    a[0] - interieur[0],
    a[1] - interieur[1],
    a[2] - interieur[2],
  ]
  const produit = normale[0] * sortant[0] + normale[1] * sortant[1] + normale[2] * sortant[2]

  return produit >= 0
    ? [triangle[0], triangle[1], triangle[2]]
    : [triangle[0], triangle[2], triangle[1]]
}

/**
 * Boîte dont les 12 arêtes et les 8 coins sont coupés à plat.
 *
 * 6 faces réduites + 12 facettes d'arête + 8 facettes de coin = **44 triangles**
 * au lieu de 12. Elle existe parce qu'une arête vive de matériau plastique
 * n'accroche aucune lumière : sans elle, le clavier et le portable se lisent
 * comme de simples parallélépipèdes, quelle que soit la qualité de l'éclairage.
 *
 * ⛔ Chaque coin porte **trois** sommets, un par face adjacente — c'est ce qui
 * donne aux facettes leurs arêtes franches. Un sommet unique par coin les
 * lisserait et effacerait le chanfrein qu'on cherche à créer.
 */
export function chamferBox(size: readonly [number, number, number], chamfer: number): Mesh {
  const [hx, hy, hz] = [size[0] / 2, size[1] / 2, size[2] / 2]
  const positions: number[] = []

  /*
   * ⭐ **Les index sont ARITHMÉTIQUES, pas cherchés dans une table.** Chaque coin
   * pousse exactement trois sommets, dans l'ordre des axes : celui du coin `c`
   * porté par l'axe `a` est donc `c * 3 + a`, et celui du coin de signes
   * `(sx, sy, sz)` se déduit de l'ordre de `CORNERS`. Aucune recherche, donc
   * aucun `undefined` à défendre.
   */
  for (const [sx, sy, sz] of CORNERS) {
    positions.push(
      sx * hx,
      sy * (hy - chamfer),
      sz * (hz - chamfer),
      sx * (hx - chamfer),
      sy * hy,
      sz * (hz - chamfer),
      sx * (hx - chamfer),
      sy * (hy - chamfer),
      sz * hz,
    )
  }

  const sommetDe = (corner: number, axe: number): number => corner * 3 + axe
  const coin = (sx: number, sy: number, sz: number): number =>
    (sx > 0 ? 4 : 0) + (sy > 0 ? 2 : 0) + (sz > 0 ? 1 : 0)

  const triangles: [number, number, number][] = []
  const quad = (a: number, b: number, c: number, d: number): void => {
    triangles.push([a, b, c], [a, c, d])
  }

  const AXES: readonly (readonly [number, number, number])[] = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ]

  for (const [axe, u, v] of AXES) {
    for (const signe of [-1, 1] as const) {
      // Les 6 faces réduites : les quatre sommets portés par l'axe de la face.
      const face = (
        [
          [-1, -1],
          [-1, 1],
          [1, 1],
          [1, -1],
        ] as const
      ).map(([su, sv]) => {
        const s: [number, number, number] = [0, 0, 0]
        s[axe] = signe
        s[u] = su
        s[v] = sv
        return sommetDe(coin(s[0], s[1], s[2]), axe)
      })
      quad(face[0] as number, face[1] as number, face[2] as number, face[3] as number)
    }

    // Les 4 facettes d'arête parallèles à cet axe.
    for (const su of [-1, 1] as const) {
      for (const sv of [-1, 1] as const) {
        const bas: [number, number, number] = [0, 0, 0]
        const haut: [number, number, number] = [0, 0, 0]
        bas[u] = su
        bas[v] = sv
        haut[u] = su
        haut[v] = sv
        bas[axe] = -1
        haut[axe] = 1
        const cBas = coin(bas[0], bas[1], bas[2])
        const cHaut = coin(haut[0], haut[1], haut[2])
        quad(sommetDe(cBas, u), sommetDe(cBas, v), sommetDe(cHaut, v), sommetDe(cHaut, u))
      }
    }
  }

  // Les 8 facettes de coin : le triangle des trois sommets d'un même coin.
  for (let c = 0; c < CORNERS.length; c += 1) {
    triangles.push([sommetDe(c, 0), sommetDe(c, 1), sommetDe(c, 2)])
  }

  const indices = triangles.flatMap((triangle) => orienter(positions, triangle, [0, 0, 0]))

  return { positions, indices }
}

/**
 * Capuchon de touche : un **tronc de pyramide**, posé sur `y = 0`.
 *
 * ⭐ Sa face supérieure est en retrait de `taper` sur chaque bord, et c'est ce
 * fruit — pas la couleur — qui fait qu'une lumière rasante détache une touche de
 * sa voisine.
 *
 * ⛔ La face inférieure est **omise** : elle est plaquée contre le corps du
 * clavier et n'est jamais visible. 5 faces au lieu de 6, soit **10 triangles au
 * lieu de 12**, sur 180 touches.
 */
export function taperedCap(width: number, depth: number, height: number, taper: number): Mesh {
  const [hw, hd] = [width / 2, depth / 2]
  const [tw, td] = [hw - taper, hd - taper]
  const positions = [
    -hw,
    0,
    -hd,
    hw,
    0,
    -hd,
    hw,
    0,
    hd,
    -hw,
    0,
    hd,
    -tw,
    height,
    -td,
    tw,
    height,
    -td,
    tw,
    height,
    td,
    -tw,
    height,
    td,
  ]
  const triangles: [number, number, number][] = [
    [4, 5, 6],
    [4, 6, 7],
    [0, 1, 5],
    [0, 5, 4],
    [1, 2, 6],
    [1, 6, 5],
    [2, 3, 7],
    [2, 7, 6],
    [3, 0, 4],
    [3, 4, 7],
  ]
  // Le centre du volume, à mi-hauteur : le capuchon est convexe et le contient.
  const indices = triangles.flatMap((triangle) => orienter(positions, triangle, [0, height / 2, 0]))

  return { positions, indices }
}

/**
 * Fusionne les capuchons d'un champ de touches en **une seule géométrie**.
 *
 * ⛔⛔ **Et non en `InstancedMesh`, malgré ce que deux commentaires de
 * `layout.ts` affirmaient encore.** L'instanciation partage une géométrie et ne
 * fait varier qu'une matrice : le **fruit** du capuchon étant une *longueur
 * absolue*, une barre d'espace de 6,25 u instanciée depuis un capuchon de 1 u en
 * hériterait un six fois trop large. C'est vérifiable, pas discutable — d'où la
 * fusion. Elle coûte exactement le **même** nombre de draw calls, un par champ ;
 * la mémoire supplémentaire est payée une fois au montage.
 *
 * ⭐ Chaque touche reçoit donc sa propre géométrie, construite à sa largeur, puis
 * translatée à sa place dans le repère du champ.
 */
export function mergeKeyField(
  keys: readonly {
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
  }[],
  height: number,
  taper: number,
): Mesh {
  const positions: number[] = []
  const indices: number[] = []

  for (const key of keys) {
    const base = positions.length / 3
    const cap = taperedCap(key.width, key.depth, height, taper)
    for (let v = 0; v < cap.positions.length; v += 3) {
      const [x, y, z] = cap.positions.slice(v, v + 3) as [number, number, number]
      positions.push(x + key.x, y, z + key.z)
    }
    for (const index of cap.indices) indices.push(index + base)
  }

  return { positions, indices }
}
