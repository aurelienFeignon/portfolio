/**
 * P5-05 — les deux géométries maison, vérifiées sur ce qu'aucun rendu ne montre.
 *
 * ⭐⭐ **C'est tout l'intérêt de les avoir écrites en données pures.** Une face
 * retournée, un solide percé, un triangle dégénéré : rien de tout cela ne
 * produit d'erreur, et rien ne se voit avant qu'une scène ne soit montée,
 * éclairée et regardée. Ici, chaque propriété est une assertion.
 *
 * Les chiffres viennent du dossier de scène : 44 triangles pour la boîte
 * chanfreinée, 132 arêtes dirigées, 10 triangles par capuchon.
 */
import { describe, expect, it } from 'vitest'

import { chamferBox, mergeKeyField, type Mesh, taperedCap } from '@/scene/state/geometry'
import { KEY_FIELDS } from '@/scene/state/layout'

const trianglesDe = (mesh: Mesh): number => mesh.indices.length / 3

const sommet = (mesh: Mesh, index: number): [number, number, number] => [
  mesh.positions[index * 3] ?? 0,
  mesh.positions[index * 3 + 1] ?? 0,
  mesh.positions[index * 3 + 2] ?? 0,
]

/** Les arêtes dirigées, telles que les triangles les parcourent. */
function aretesDirigees(mesh: Mesh): string[] {
  const aretes: string[] = []
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [mesh.indices[t] ?? 0, mesh.indices[t + 1] ?? 0, mesh.indices[t + 2] ?? 0]
    aretes.push(`${a}>${b}`, `${b}>${c}`, `${c}>${a}`)
  }
  return aretes
}

/** Aire du triangle : nulle si les trois sommets sont alignés ou confondus. */
function aire(mesh: Mesh, t: number): number {
  const [a, b, c] = [
    sommet(mesh, mesh.indices[t] ?? 0),
    sommet(mesh, mesh.indices[t + 1] ?? 0),
    sommet(mesh, mesh.indices[t + 2] ?? 0),
  ]
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const n = [
    (ab[1] ?? 0) * (ac[2] ?? 0) - (ab[2] ?? 0) * (ac[1] ?? 0),
    (ab[2] ?? 0) * (ac[0] ?? 0) - (ab[0] ?? 0) * (ac[2] ?? 0),
    (ab[0] ?? 0) * (ac[1] ?? 0) - (ab[1] ?? 0) * (ac[0] ?? 0),
  ]
  return Math.hypot(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0) / 2
}

/** Toutes les faces regardent-elles vers l'extérieur du point intérieur donné ? */
function toutesSortantes(mesh: Mesh, interieur: readonly [number, number, number]): boolean {
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const a = sommet(mesh, mesh.indices[t] ?? 0)
    const b = sommet(mesh, mesh.indices[t + 1] ?? 0)
    const c = sommet(mesh, mesh.indices[t + 2] ?? 0)
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [
      (ab[1] ?? 0) * (ac[2] ?? 0) - (ab[2] ?? 0) * (ac[1] ?? 0),
      (ab[2] ?? 0) * (ac[0] ?? 0) - (ab[0] ?? 0) * (ac[2] ?? 0),
      (ab[0] ?? 0) * (ac[1] ?? 0) - (ab[1] ?? 0) * (ac[0] ?? 0),
    ]
    const vers = [a[0] - interieur[0], a[1] - interieur[1], a[2] - interieur[2]]
    if (
      (n[0] ?? 0) * (vers[0] ?? 0) + (n[1] ?? 0) * (vers[1] ?? 0) + (n[2] ?? 0) * (vers[2] ?? 0) <
      0
    ) {
      return false
    }
  }
  return true
}

describe('boîte chanfreinée', () => {
  const boite = chamferBox([0.44, 0.03, 0.15], 0.008)

  it('compte 44 triangles : 6 faces, 12 facettes d’arête, 8 facettes de coin', () => {
    expect(trianglesDe(boite)).toBe(44)
  })

  it('porte 24 sommets — trois par coin, un par face adjacente', () => {
    // Un sommet unique par coin lisserait les facettes et effacerait le
    // chanfrein qu'on cherche justement à créer.
    expect(boite.positions.length / 3).toBe(24)
  })

  it('⛔ est ÉTANCHE : 132 arêtes dirigées, chacune parcourue une fois dans chaque sens', () => {
    const aretes = aretesDirigees(boite)
    const orphelines = aretes.filter((arete) => {
      const [a, b] = arete.split('>')
      return !aretes.includes(`${b}>${a}`)
    })

    expect(aretes).toHaveLength(132)
    expect(orphelines).toEqual([])
    expect(new Set(aretes).size).toBe(132)
  })

  it('⛔ n’a aucune face retournée — le contrôle que 22 triangles sur 44 avaient échoué', () => {
    expect(toutesSortantes(boite, [0, 0, 0])).toBe(true)
  })

  it('n’a aucun triangle dégénéré', () => {
    const plats: number[] = []
    for (let t = 0; t < boite.indices.length; t += 3) if (aire(boite, t) < 1e-12) plats.push(t / 3)

    expect(plats).toEqual([])
  })

  it('tient dans la boîte qu’on lui a demandée, chanfrein compris', () => {
    const TAILLE = [0.44, 0.03, 0.15] as const
    for (const axe of [0, 1, 2] as const) {
      const demi = TAILLE[axe] / 2
      for (let v = 0; v < boite.positions.length / 3; v += 1) {
        expect(Math.abs(sommet(boite, v)[axe])).toBeLessThanOrEqual(demi + 1e-12)
      }
    }
  })

  it('recule bien de la valeur du chanfrein sur les faces voisines', () => {
    // Un sommet porté par l'axe X est à ±hx sur X, et à ±(h − chanfrein) ailleurs.
    const xs = [...new Set(Array.from({ length: 24 }, (_, v) => Math.abs(sommet(boite, v)[0])))]

    expect(xs.sort((a, b) => a - b).map((x) => Number(x.toFixed(4)))).toEqual([0.212, 0.22])
  })
})

describe('capuchon de touche', () => {
  const capuchon = taperedCap(0.0165, 0.0165, 0.006, 0.0012)

  it('compte 10 triangles : la face inférieure est omise, jamais visible', () => {
    // Sur 180 touches, c'est 360 triangles économisés pour rien de perdu.
    expect(trianglesDe(capuchon)).toBe(10)
  })

  it('est un TRONC de pyramide : sa face haute est en retrait sur chaque bord', () => {
    const hauts = Array.from({ length: 8 }, (_, v) => sommet(capuchon, v)).filter(([, y]) => y > 0)
    const bas = Array.from({ length: 8 }, (_, v) => sommet(capuchon, v)).filter(([, y]) => y === 0)

    expect(Math.max(...hauts.map(([x]) => Math.abs(x)))).toBeCloseTo(0.0165 / 2 - 0.0012, 6)
    expect(Math.max(...bas.map(([x]) => Math.abs(x)))).toBeCloseTo(0.0165 / 2, 6)
  })

  it('repose sur y = 0 et monte à sa hauteur', () => {
    const ys = Array.from({ length: 8 }, (_, v) => sommet(capuchon, v)[1])

    expect(Math.min(...ys)).toBe(0)
    expect(Math.max(...ys)).toBeCloseTo(0.006, 6)
  })

  it('n’a aucune face retournée', () => {
    expect(toutesSortantes(capuchon, [0, 0.003, 0])).toBe(true)
  })

  it('⚠️ n’est PAS étanche, et c’est voulu : le fond manque', () => {
    // Le dire ici évite qu'un futur contrôle d'étanchéité générique le prenne
    // pour un défaut — c'est une économie, pas un trou.
    const aretes = aretesDirigees(capuchon)
    const bordLibre = aretes.filter((arete) => {
      const [a, b] = arete.split('>')
      return !aretes.includes(`${b}>${a}`)
    })

    expect(bordLibre).toHaveLength(4)
  })
})

describe('champ de touches fusionné', () => {
  const clavier = mergeKeyField(KEY_FIELDS[0]?.keys ?? [], 0.006, 0.0012)

  it('rend 1 040 triangles pour 104 touches, en UNE géométrie donc un draw call', () => {
    expect(trianglesDe(clavier)).toBe(104 * 10)
  })

  it('⛔ chaque touche garde SON fruit, ce qu’un `InstancedMesh` ne permet pas', () => {
    /*
     * C'est la raison pour laquelle la fusion l'emporte sur l'instanciation, et
     * elle se mesure : la barre d'espace fait 6,25 u, une touche ordinaire 1 u.
     * Instanciées depuis une même géométrie, leur retrait serait proportionnel ;
     * fusionnées, il est identique — 1,2 mm de chaque côté, partout.
     */
    const touches = KEY_FIELDS[0]?.keys ?? []
    const large = touches.reduce((a, b) => (b.width > a.width ? b : a), touches[0] ?? { width: 0 })
    const etroite = touches.reduce(
      (a, b) => (b.width < a.width ? b : a),
      touches[0] ?? { width: 1 },
    )

    expect(large.width / etroite.width).toBeGreaterThan(5)

    for (const largeur of [large.width, etroite.width]) {
      const cap = taperedCap(largeur, 0.019, 0.006, 0.0012)
      const hauts = Array.from({ length: 8 }, (_, v) => sommet(cap, v)).filter(([, y]) => y > 0)
      const retrait = largeur / 2 - Math.max(...hauts.map(([x]) => Math.abs(x)))

      expect(retrait).toBeCloseTo(0.0012, 9)
    }
  })

  it('⛔ n’a aucune face retournée, touche par touche', () => {
    /*
     * ⛔⛔ La première écriture de ce cas n'affirmait que `aire > 0` — or l'aire
     * est une NORME : elle vaut la même chose à l'endroit et à l'envers. Un
     * enroulement inversé dans la fusion serait passé au vert. Relevé en revue.
     * Chaque capuchon est donc éprouvé contre SON propre point intérieur, à
     * mi-hauteur au-dessus de sa position dans le champ.
     */
    const touches = KEY_FIELDS[0]?.keys ?? []
    for (const key of touches) {
      const cap = mergeKeyField([key], 0.006, 0.0012)
      expect(toutesSortantes(cap, [key.x, 0.003, key.z])).toBe(true)
    }
  })
})
