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

function noeud(id: string) {
  const trouve = NODES.find((candidat) => candidat.id === id)
  // ⛔ Un identifiant renommé dans `layout.ts` doit le DIRE, pas rendre `undefined`
  // et laisser l'assertion suivante échouer sur un diff illisible.
  if (trouve === undefined) throw new Error(`Aucun nœud « ${id} » dans layout.ts`)
  return trouve
}

const DEG = Math.PI / 180

/**
 * La normale d'une dalle — le +Z du plan, tourné par son Euler `XYZ` (l'ordre
 * par défaut de `three`) : `(sin b, −sin a · cos b, cos a · cos b)`.
 */
function normale([a, b]: readonly [number, number, number]): [number, number, number] {
  return [
    Math.sin(b * DEG),
    -Math.sin(a * DEG) * Math.cos(b * DEG),
    Math.cos(a * DEG) * Math.cos(b * DEG),
  ]
}

function unitaire([x, y, z]: readonly [number, number, number]): [number, number, number] {
  const norme = Math.hypot(x, y, z)
  return [x / norme, y / norme, z / norme]
}

/** Les dalles que l'oracle attend — dérivé de lui, jamais de ce que rend le code. */
const ECRANS = FOCUSES.flatMap((focus) => {
  const dalle = DALLE_ATTENDUE[focus]
  return dalle === undefined ? [] : [[focus, dalle] as const]
})

describe('l’exemple de testing-strategy.md §4.3', () => {
  it('experiences → le cadrage de l’écran gauche', () => {
    const cadrage = getCameraTarget({ focus: 'experiences', detail: null })

    expect(cadrage.focusNodeId).toBe('dalleGauche')
    expect(cadrage.target).toEqual(noeud('dalleGauche').position)
  })
})

describe('chaque focus cadre sa dalle', () => {
  for (const focus of FOCUSES) {
    it(`${focus} → ${DALLE_ATTENDUE[focus] ?? 'aucune dalle, la vue d’ensemble'}`, () => {
      expect(getCameraTarget({ focus, detail: null }).focusNodeId).toBe(DALLE_ATTENDUE[focus])
    })
  }

  // C'est ce qui donne un sens à `focusNodeId` : le nom seul ne garantit pas que la
  // caméra regarde l'écran. `layout.ts` pose chaque cadrage d'écran « centre de la
  // dalle ± normale × distance » ; ce banc vérifie les deux moitiés de la formule
  // au lieu de croire le commentaire. ⭐ Le périmètre vient de l'ORACLE : un
  // cadrage qui aurait perdu son `focusNodeId` ne peut pas s'en faire dispenser.
  for (const [focus, dalle] of ECRANS) {
    it(`⭐ ${focus} vise le CENTRE de ${dalle}`, () => {
      expect(getCameraTarget({ focus, detail: null }).target).toEqual(noeud(dalle).position)
    })

    it(`⭐ ${focus} regarde ${dalle} DE FACE, sur sa normale`, () => {
      // ⛔ 4° hors normale donnent 9,6 % d'écart entre les marges gauche et
      // droite du cadre — un écran qui se lit mal centré (`layout.ts`). Les cotes
      // sont arrondies au dixième de millimètre : 10⁻³ sur un vecteur unitaire
      // les absorbe, et laisse 4° (≈ 0,07) très au-dessus.
      const { position, target } = getCameraTarget({ focus, detail: null })
      const visee = unitaire([
        position[0] - target[0],
        position[1] - target[1],
        position[2] - target[2],
      ])
      const attendue = normale(noeud(dalle).rotationDeg)

      visee.forEach((composante, i) => expect(composante).toBeCloseTo(attendue[i] ?? NaN, 3))
    })
  }
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
