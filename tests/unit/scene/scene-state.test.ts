/**
 * P6-01 — l'état de scène, dérivé de l'URL et de rien d'autre.
 *
 * ADR-0002 : *l'URL décide, la scène suit*.
 *
 * ⭐ **Ce banc n'éprouve pas la lecture d'URL**, qui vit dans `src/routing/paths.ts`
 * avec `pathFor` dont elle est l'inverse, et qui est tenue par
 * `tests/unit/routing/paths.test.ts` — décodage des slugs, barre finale,
 * profondeur, sections sans fiche d'entité. Ce qui est ici est la seule décision
 * de **scène** : ce que chaque endroit du site fait cadrer, et ce qui s'effondre
 * vers la vue d'ensemble.
 */
import { describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/locales'
import { entityPath, homePath, parsePagePath, sectionPath } from '@/routing/paths'
import { SECTIONS } from '@/routing/sections'
import {
  OVERVIEW,
  type SceneFocus,
  getRouteForScreen,
  resolveSceneState,
} from '@/scene/state/scene-state'

/**
 * Les quatre focus — et l'exhaustivité est tenue par le **compilateur**.
 *
 * ⭐⭐ C'est un `Record<SceneFocus, true>` : une section ajoutée sans y être
 * déclarée **ne compile pas**, et une clé de trop non plus. Aucun `expect` ne
 * pourrait rendre ce service — un `satisfies readonly SceneFocus[]` sur un tableau
 * ne vérifie que l'appartenance, jamais la complétude, si bien qu'une liste
 * dérivée peut **rétrécir en silence** (mesuré : amputée d'`overview`, elle
 * laissait toute la suite verte).
 */
const TOUS_LES_FOCUS: Record<SceneFocus, true> = {
  overview: true,
  experiences: true,
  projects: true,
  skills: true,
}

const FOCUSES = Object.keys(TOUS_LES_FOCUS) as readonly SceneFocus[]

describe('les quatre exemples de testing-strategy.md §4.3', () => {
  it('/fr/projects → la section, sans entité', () => {
    expect(resolveSceneState('/fr/projects')).toEqual({ focus: 'projects', detail: null })
  })

  it('/en/projects/augure → la section ET l’entité', () => {
    expect(resolveSceneState('/en/projects/augure')).toEqual({
      focus: 'projects',
      detail: 'augure',
    })
  })

  it('/fr → la vue d’ensemble', () => {
    expect(resolveSceneState('/fr')).toEqual(OVERVIEW)
  })

  it('/fr/inconnu → la vue d’ensemble', () => {
    expect(resolveSceneState('/fr/inconnu')).toEqual(OVERVIEW)
  })
})

describe('le mapping écran ↔ section, dérivé et non énuméré', () => {
  // ⭐ Le périmètre est DÉRIVÉ de `SECTIONS` et de `LOCALES` : ajouter une
  // quatrième section sans lui donner de segment fait rougir ce banc tout seul.
  // L'énumérer à la main aurait laissé la nouvelle section hors du contrôle,
  // silencieusement (leçon 5 de la Phase 4).
  for (const locale of LOCALES) {
    for (const section of SECTIONS) {
      it(`${sectionPath(locale, section)} → ${section}`, () => {
        expect(resolveSceneState(sectionPath(locale, section))).toEqual({
          focus: section,
          detail: null,
        })
      })
    }

    it(`${homePath(locale)} → la vue d’ensemble`, () => {
      // ⛔ L'accueil est une page bien SERVIE, et il ne cadre pourtant aucun
      // écran : c'est le second cas que la vue d'ensemble recouvre, et rien ne
      // le rapproche du premier ailleurs.
      expect(resolveSceneState(homePath(locale))).toEqual(OVERVIEW)
    })
  }
})

describe('ce que la scène ne peut pas savoir, et n’affirme donc pas', () => {
  it('⭐ garde la section quand l’entité n’existe pas — `detail` NOMME, il ne vérifie pas', () => {
    // Le proxy réécrit cette adresse vers la 404, mais l'URL affichée reste
    // celle-ci. La couche scène ne peut pas lire `content/` : elle rend ce que
    // l'URL désigne, et le visiteur reste dans la zone où il se trouve.
    expect(resolveSceneState('/fr/projects/inexistant')).toEqual({
      focus: 'projects',
      detail: 'inexistant',
    })
  })
})

describe('tout ce qu’aucune route ne sert s’effondre vers la vue d’ensemble', () => {
  it.each([
    ['une locale inconnue, même suivie d’une section valide', '/de/projects'],
    ['un segment de section inconnu', '/fr/inconnu'],
    ['plus profond qu’une entité', '/fr/projects/augure/extra'],
    ['une compétence, qui n’a pas de page en v1', entityPath('fr', 'skills', 'typescript')],
  ])('%s', (_label, pathname) => {
    expect(resolveSceneState(pathname)).toEqual(OVERVIEW)
  })

  it('⭐ et rend TOUJOURS la même instance, jamais un littéral reconstruit', () => {
    // P6-04 pourra distinguer « rien n'a changé » par identité, sans comparer
    // champ à champ. La propriété est gratuite, mais seulement si personne ne
    // réécrit `{ focus: 'overview', detail: null }` à la main quelque part.
    expect(resolveSceneState('/de/projects')).toBe(OVERVIEW)
    expect(resolveSceneState('/fr')).toBe(OVERVIEW)
  })
})

describe('la route d’un écran — l’autre sens du flux (P6-03)', () => {
  it('l’exemple de testing-strategy.md §4.3', () => {
    expect(getRouteForScreen('skills', 'en')).toBe('/en/skills')
  })

  it('⭐ la vue d’ensemble EST une destination : le bureau, c’est l’accueil', () => {
    // Sans elle, P6-05 devrait appeler `homePath` à côté pour « revenir au
    // bureau » — et ADR-0002 n'aurait plus un seul sens de flux, mais deux.
    expect(getRouteForScreen('overview', 'fr')).toBe(homePath('fr'))
  })

  it('n’écrit aucun chemin elle-même', () => {
    // La construction d'URL a un point unique (`src/routing/paths.ts`). Ce banc
    // le dit en comparant à ce que ce point produit, jamais à un littéral.
    for (const locale of LOCALES) {
      for (const section of SECTIONS) {
        expect(getRouteForScreen(section, locale)).toBe(sectionPath(locale, section))
      }
    }
  })

  describe('⭐⭐ l’aller-retour, sur les quatre focus et les deux locales', () => {
    // Le périmètre est DÉRIVÉ de `TOUS_LES_FOCUS` : un écran ajouté sans route,
    // ou une route qui ne relit pas son écran, fait rougir ce banc tout seul.
    for (const focus of FOCUSES) {
      for (const locale of LOCALES) {
        it(`${focus} en ${locale}`, () => {
          const route = getRouteForScreen(focus, locale)

          expect(resolveSceneState(route).focus).toBe(focus)

          // ⛔⛔ L'aller-retour SEUL ne suffit pas, et le trou est DOUBLE — les
          // deux fois parce que `overview` ABSORBE ce qui ne va pas :
          //
          // 1. n'importe quelle adresse que le site ne sert pas le satisfait,
          //    puisqu'elle s'effondre justement vers la vue d'ensemble ;
          // 2. et `resolveSceneState` ne rend PAS la langue, donc `/fr` et `/en`
          //    y sont indiscernables — un `homePath('fr')` écrit en dur passait,
          //    et un visiteur anglophone qui revient au bureau (Échap, P6-05)
          //    aurait changé de langue sans l'avoir demandé. Mutation vue
          //    survivante avant ces deux lignes, tuée après. Relevé en revue.
          expect(parsePagePath(route)?.locale).toBe(locale)
        })
      }
    }
  })
})
