/**
 * P6-02 — le cadrage que vise chaque état de scène.
 *
 * ADR-0002 : *l'URL décide, la scène suit* — ce banc éprouve le deuxième maillon,
 * `SceneState ──▶ getCameraTarget ──▶ caméra`.
 *
 * ⭐ **Aucune cote n'est écrite ici.** Les quatre cadrages vivent dans `layout.ts`
 * et y sont tenus par `layout.test.ts` ; ce banc n'affirme que la correspondance
 * entre les deux vocabulaires — `SceneFocus` (l'URL, en anglais) et `ViewId` (le
 * plan coté, en français) — et il compare toujours à ce que `layout.ts` porte,
 * jamais à un nombre recopié.
 */
import { describe, expect, it } from 'vitest'

import { CAMERAS, NODES } from '@/scene/state/layout'
import { getCameraTarget } from '@/scene/state/camera-target'
import type { SceneFocus } from '@/scene/state/scene-state'

/**
 * L'oracle : la dalle que chaque focus doit cadrer, `undefined` pour la vue
 * d'ensemble.
 *
 * ⭐⭐ **C'est un `Record<SceneFocus, …>`, donc l'exhaustivité est tenue par le
 * compilateur** — une section ajoutée sans y être déclarée ne compile pas, comme
 * dans `scene-state.test.ts`.
 *
 * ⛔ **Ce n'est pas une recopie du mapping, c'est un second énoncé du même fait,
 * dans un autre vocabulaire** — les identifiants de nœuds, qui existent déjà.
 * Sans lui, échanger deux écrans dans le module laisserait le banc vert : chaque
 * focus viserait toujours *un* cadrage de `layout.ts`, distinct des autres, et
 * seul l'exemple de `testing-strategy.md` §4.3 — `experiences` — serait gardé.
 * La place des sections sur le bureau vient du dossier de scène (écran gauche,
 * central, portable) ; c'est le fait que ce banc confronte au code.
 */
const DALLE_ATTENDUE: Record<SceneFocus, string | undefined> = {
  overview: undefined,
  experiences: 'dalleGauche',
  projects: 'dalleCentre',
  skills: 'dallePortable',
}

const FOCUSES = Object.keys(DALLE_ATTENDUE) as readonly SceneFocus[]

const positionDuNoeud = (id: string) => NODES.find((node) => node.id === id)?.position

describe('l’exemple de testing-strategy.md §4.3', () => {
  it('experiences → le cadrage de l’écran gauche', () => {
    const cadrage = getCameraTarget({ focus: 'experiences', detail: null })

    expect(cadrage.focusNodeId).toBe('dalleGauche')
    expect(cadrage.target).toEqual(positionDuNoeud('dalleGauche'))
  })
})

describe('chaque focus cadre sa dalle', () => {
  for (const focus of FOCUSES) {
    it(`${focus} → ${DALLE_ATTENDUE[focus] ?? 'aucune dalle, la vue d’ensemble'}`, () => {
      expect(getCameraTarget({ focus, detail: null }).focusNodeId).toBe(DALLE_ATTENDUE[focus])
    })
  }

  it('⭐ un cadrage d’écran vise le CENTRE de la dalle qu’il nomme', () => {
    // C'est ce qui donne un sens à `focusNodeId` : le nom seul ne garantit pas
    // que la caméra regarde l'écran. `layout.ts` calcule la cible comme le centre
    // de la dalle (« centre de la dalle ± normale × distance ») ; ce banc vérifie
    // que les deux restent la même cote, au lieu de le croire.
    for (const focus of FOCUSES) {
      const cadrage = getCameraTarget({ focus, detail: null })
      if (cadrage.focusNodeId === undefined) continue

      expect(cadrage.target, focus).toEqual(positionDuNoeud(cadrage.focusNodeId))
    }
  })
})

describe('les cadrages sont LUS dans layout.ts, jamais recopiés', () => {
  it('⭐ rend l’instance de CAMERAS elle-même', () => {
    // `toContain` compare par identité : un littéral recopié, même juste au
    // millimètre, échoue ici. P6-04 pourra aussi dire « même cible » sans
    // comparer coordonnée à coordonnée.
    for (const focus of FOCUSES) {
      expect(Object.values(CAMERAS), focus).toContain(getCameraTarget({ focus, detail: null }))
    }
  })
})

describe('ce que `detail` ne change pas', () => {
  it('⭐ une fiche d’entité garde le cadrage de sa section', () => {
    // Aucune cote par entité n'existe : le dossier cadre des ÉCRANS, et une fiche
    // s'affiche sur l'écran de sa section (Phase 7). `detail` nomme un slug que
    // cette couche ne peut de toute façon pas vérifier (`scene-state.ts`).
    for (const focus of FOCUSES) {
      expect(getCameraTarget({ focus, detail: 'quelconque' }), focus).toBe(
        getCameraTarget({ focus, detail: null }),
      )
    }
  })
})
