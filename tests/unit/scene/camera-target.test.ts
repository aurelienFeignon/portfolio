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

import { CAMERAS } from '@/scene/state/layout'
import { getCameraTarget } from '@/scene/state/camera-target'
import type { SceneFocus } from '@/scene/state/scene-state'

/**
 * L'oracle : l'univers que chaque focus doit cadrer, `undefined` pour la vue
 * d'ensemble.
 *
 * ⭐⭐ **C'est un `Record<SceneFocus, …>`, donc l'exhaustivité est tenue par le
 * compilateur** — une section ajoutée sans y être déclarée ne compile pas.
 *
 * ⛔ **Ce n'est pas une recopie du mapping, c'est un second énoncé du même fait.**
 * Sans lui, échanger deux univers dans le `Record` du module laisserait le banc
 * vert : chaque focus viserait toujours *un* cadrage de `layout.ts`, distinct des
 * autres. Depuis NEXUS (D11), chaque univers EST une section : l'oracle dit que
 * le focus `projects` cadre l'univers `projects`, et rien d'autre.
 */
const UNIVERS_ATTENDU: Record<SceneFocus, string | undefined> = {
  overview: undefined,
  experiences: 'experiences',
  projects: 'projects',
  skills: 'skills',
}

const FOCUSES = Object.keys(UNIVERS_ATTENDU) as readonly SceneFocus[]

const cadrage = (focus: SceneFocus, detail: string | null = null) =>
  getCameraTarget({ focus, detail })

describe('chaque focus cadre son univers', () => {
  // ⭐ Le cas `experiences` est l'exemple de `testing-strategy.md` §4.3 —
  // « le cadrage de l'écran gauche ». Que ce cadrage vise le centre de son univers,
  // de face, est une propriété de `layout.ts`, tenue par `layout.test.ts`.
  for (const focus of FOCUSES) {
    it(`${focus} → ${UNIVERS_ATTENDU[focus] ?? 'aucun univers, la vue d’ensemble'}`, () => {
      expect(cadrage(focus).focusNodeId).toBe(UNIVERS_ATTENDU[focus])
    })
  }
})

describe('les cadrages sont LUS dans layout.ts, jamais recopiés', () => {
  it('⭐ rend l’instance de CAMERAS elle-même', () => {
    // `toContain` compare par identité : un littéral recopié, même juste au
    // millimètre, échoue ici. P6-04 pourra aussi dire « même cible » sans
    // comparer coordonnée à coordonnée.
    for (const focus of FOCUSES) {
      expect(Object.values(CAMERAS), focus).toContain(cadrage(focus))
    }
  })
})

describe('ce que `detail` ne change pas', () => {
  it('⭐ une fiche d’entité garde le cadrage de sa section', () => {
    // Aucune cote par entité n'existe : le dossier cadre des ÉCRANS, et une fiche
    // s'affiche sur l'écran de sa section (Phase 7). `detail` nomme un slug que
    // cette couche ne peut de toute façon pas vérifier (`scene-state.ts`).
    for (const focus of FOCUSES) {
      expect(cadrage(focus, 'quelconque'), focus).toBe(cadrage(focus))
    }
  })
})
