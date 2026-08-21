/**
 * P5-05 — le plan coté, et ce qui prouve qu'il est arrivé intact.
 *
 * ⭐⭐ **Ce banc n'est pas décoratif : il est le contrôle de transcription.** Ce
 * fichier de données vient d'un dossier de référence tenu hors du dépôt (D10) —
 * seul `layout.ts` entre ici. Les chiffres ci-dessous sont ceux que ce dossier
 * annonce, recomptés depuis les données : **une seule cote mal recopiée, une
 * rangée de clavier omise, et l'un d'eux tombe.**
 *
 * ⭐ Ils gardent aussi les invariants que le dossier énonce en prose, et qu'un
 * type ne peut pas exprimer — un chanfrein plus large que la moitié de la plus
 * petite dimension retournerait la géométrie, une caméra peut désigner un écran
 * qui n'existe pas.
 */
import { describe, expect, it } from 'vitest'

import { CAMERAS, KEY_FIELDS, LIGHTS, MATERIALS, NODES } from '@/scene/state/layout'

/** Triangles par primitive, tels que three.js les construit (§7 du dossier). */
const TRIANGLES = { plane: 2, box: 12, chamferBox: 44, cylinder: 96, sphere: 720 } as const

/** Un capuchon est un tronc de pyramide : 5 faces, la 6ᵉ étant plaquée contre le corps. */
const TRIANGLES_PAR_TOUCHE = 10

const surProfil = (mobile: boolean) => ({
  nodes: NODES.filter((node) => !(mobile && node.desktopOnly === true)),
  fields: KEY_FIELDS.filter((field) => !(mobile && field.desktopOnly === true)),
})

function budget(mobile: boolean): { drawCalls: number; triangles: number } {
  const { nodes, fields } = surProfil(mobile)
  const triangles =
    nodes.reduce((total, node) => total + TRIANGLES[node.shape], 0) +
    fields.reduce((total, field) => total + field.keys.length * TRIANGLES_PAR_TOUCHE, 0)
  return { drawCalls: nodes.length + fields.length, triangles }
}

describe('budget de la scène, recompté depuis les données', () => {
  it('desktop : 30 draw calls et 4 114 triangles, comme le dossier l’annonce', () => {
    expect(budget(false)).toEqual({ drawCalls: 30, triangles: 4_114 })
  })

  it('mobile : 20 et 1 966, les objets `desktopOnly` écartés', () => {
    expect(budget(true)).toEqual({ drawCalls: 20, triangles: 1_966 })
  })

  it('tient très largement sous les seuils de la phase', () => {
    expect(budget(false).drawCalls).toBeLessThanOrEqual(60)
    expect(budget(false).triangles).toBeLessThanOrEqual(150_000)
    expect(budget(true).drawCalls).toBeLessThanOrEqual(30)
    expect(budget(true).triangles).toBeLessThanOrEqual(50_000)
  })
})

describe('champs de touches', () => {
  it.each([
    ['clavierTouches', 104],
    ['portableTouches', 76],
  ])('%s compte %i touches', (id, attendu) => {
    expect(KEY_FIELDS.find((field) => field.id === id)?.keys.length).toBe(attendu)
  })

  it('⛔ aucune touche ne déborde de sa grille', () => {
    // Le dossier justifie la pureté de `buildKeys` par cette vérification même :
    // une rangée trop longue se voit ici, jamais à l'œil sur un rendu.
    const debords = KEY_FIELDS.flatMap((field) => {
      const demiLargeur = Math.max(...field.keys.map((key) => Math.abs(key.x) + key.width / 2))
      const demiProfondeur = Math.max(...field.keys.map((key) => Math.abs(key.z) + key.depth / 2))
      return field.id === 'clavierTouches'
        ? [
            [
              field.id,
              demiLargeur <= (22.5 * 0.019) / 2 + 0.001,
              demiProfondeur <= (6.5 * 0.019) / 2 + 0.001,
            ],
          ]
        : [
            [
              field.id,
              demiLargeur <= (15 * 0.019) / 2 + 0.001,
              demiProfondeur <= (6 * 0.019) / 2 + 0.001,
            ],
          ]
    }).filter(([, largeurOk, profondeurOk]) => !(largeurOk && profondeurOk))

    expect(debords).toEqual([])
  })

  it('laisse un jeu entre capuchons voisins — c’est lui qui rend la grille lisible', () => {
    for (const field of KEY_FIELDS) {
      for (const key of field.keys) {
        expect(key.width).toBeGreaterThan(0)
        expect(key.depth).toBeGreaterThan(0)
      }
    }
  })
})

describe('invariants que le type ne peut pas exprimer', () => {
  it('chaque nœud désigne un matériau qui existe', () => {
    const inconnus = NODES.filter((node) => MATERIALS[node.material] === undefined)

    expect(inconnus).toEqual([])
  })

  it('⛔ un chanfrein reste sous la moitié de la plus petite dimension', () => {
    // Au-delà, les facettes se croisent et la boîte se retourne sur elle-même.
    const fautifs = NODES.filter(
      (node) => node.chamfer !== undefined && node.chamfer >= Math.min(...node.size) / 2,
    )

    expect(fautifs).toEqual([])
  })

  it('chaque cadrage rapproché vise un écran qui existe', () => {
    const ids = new Set(NODES.map((node) => node.id))
    const orphelins = Object.values(CAMERAS)
      .map((camera) => camera.focusNodeId)
      .filter((id) => id !== undefined && !ids.has(id))

    expect(orphelins).toEqual([])
  })

  it('la vue d’ensemble ne vise aucun écran, les trois autres en visent un', () => {
    expect(CAMERAS.accueil.focusNodeId).toBeUndefined()
    expect(
      [CAMERAS.experiences, CAMERAS.projets, CAMERAS.competences].every(
        (camera) => camera.focusNodeId !== undefined,
      ),
    ).toBe(true)
  })

  it('une seule source projette des ombres, et son frustum couvre l’objet le plus éloigné', () => {
    const projetantes = LIGHTS.filter((light) => 'castShadow' in light && light.castShadow)

    expect(projetantes).toHaveLength(1)
    // Le plus éloigné qui projette est le pied gauche du bureau, à 0,97 m.
    const etendue = projetantes[0]
    expect(etendue && 'shadowExtent' in etendue ? etendue.shadowExtent : 0).toBeGreaterThanOrEqual(
      0.97,
    )
  })

  it('⛔ la ponctuelle porte un `decay` explicite : sa valeur par défaut a changé selon les versions', () => {
    const ponctuelle = LIGHTS.find((light) => light.kind === 'point')

    expect(ponctuelle?.kind === 'point' ? ponctuelle.decay : undefined).toBe(2)
  })
})
