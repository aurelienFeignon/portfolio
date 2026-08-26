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
  SCENE_FOCUSES,
  type SceneFocus,
  getRouteForScreen,
  resolveSceneState,
} from '@/scene/state/scene-state'

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

  it('⭐⭐ `SCENE_FOCUSES` les énumère TOUS — sans quoi les boucles ci-dessous rétrécissent en silence', () => {
    // Le littéral ci-dessous est un `Record<SceneFocus, true>` : ajouter une
    // section sans l'y déclarer NE COMPILE PAS. C'est ce qui fait de ce contrôle
    // autre chose qu'une tautologie — il oblige un humain à passer par ici, puis
    // confronte sa liste à celle que le code exporte.
    const tous: Record<SceneFocus, true> = {
      overview: true,
      experiences: true,
      projects: true,
      skills: true,
    }

    expect([...SCENE_FOCUSES].sort()).toEqual(Object.keys(tous).sort())
  })

  describe('⭐⭐ l’aller-retour, sur les quatre focus et les deux locales', () => {
    // Le périmètre est DÉRIVÉ de `SCENE_FOCUSES` : un écran ajouté sans route,
    // ou une route qui ne relit pas son écran, fait rougir ce banc tout seul.
    for (const focus of SCENE_FOCUSES) {
      for (const locale of LOCALES) {
        it(`${focus} en ${locale}`, () => {
          const route = getRouteForScreen(focus, locale)

          expect(resolveSceneState(route).focus).toBe(focus)

          // ⛔ L'aller-retour SEUL ne suffit pas, et c'est le piège : pour
          // `overview`, n'importe quelle adresse que le site ne sert pas le
          // satisfait — elle s'effondre justement vers la vue d'ensemble. Il
          // faut donc affirmer en plus que la route désigne une VRAIE page.
          expect(parsePagePath(route)).not.toBeNull()
        })
      }
    }
  })
})
