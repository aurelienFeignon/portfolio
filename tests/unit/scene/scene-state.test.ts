/**
 * P6-01 — l'état de scène, dérivé de l'URL et de rien d'autre.
 *
 * ADR-0002 : *l'URL décide, la scène suit*. Ce banc tient le premier maillon —
 * `resolveSceneState`, pure, sans Three.js, sans lecture du contenu.
 *
 * ⭐ **La règle tient en une phrase, et c'est elle qu'on éprouve** : la fonction
 * lit la **forme** de l'URL, jamais l'**existence** de ce qu'elle nomme. Une
 * forme qu'aucune route ne sert rend `overview` ; une forme servie rend sa
 * section, avec le nom que l'URL porte — que l'entité existe ou non, ce que
 * cette couche ne peut pas savoir (`scene → content` est interdit,
 * `architecture.md` §1.2).
 */
import { describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/locales'
import { entityPath, homePath, sectionPath } from '@/routing/paths'
import { SECTIONS } from '@/routing/sections'
import { OVERVIEW, resolveSceneState } from '@/scene/state/scene-state'

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
      expect(resolveSceneState(homePath(locale))).toEqual(OVERVIEW)
    })
  }
})

describe('ce que la fonction ne peut pas savoir, et n’affirme donc pas', () => {
  it('⭐ garde la section quand l’entité n’existe pas — `detail` NOMME, il ne vérifie pas', () => {
    // Le proxy réécrit cette adresse vers la 404, mais l'URL affichée reste
    // celle-ci. La couche scène ne peut pas lire `content/` : elle rend ce que
    // l'URL désigne, et le visiteur reste dans la zone où il se trouve.
    expect(resolveSceneState('/fr/projects/inexistant')).toEqual({
      focus: 'projects',
      detail: 'inexistant',
    })
  })

  it('décode le slug, parce que `entityPath` l’encode — la propriété est l’aller-retour', () => {
    const chemin = entityPath('fr', 'projects', 'été 2026')

    expect(chemin).not.toContain('é')
    expect(resolveSceneState(chemin)).toEqual({ focus: 'projects', detail: 'été 2026' })
  })

  it('⛔ un échappement impossible ne nomme aucune entité, et ne jette pas', () => {
    // `%E0%A4%A` est tronqué : aucun encodage ne l'a produit, donc il ne désigne
    // rien. La section reste — le visiteur est bien dans Projets, sur rien.
    expect(resolveSceneState('/fr/projects/%E0%A4%A')).toEqual({
      focus: 'projects',
      detail: null,
    })
  })
})

describe('les formes qu’aucune route ne sert rendent la vue d’ensemble', () => {
  it('⛔ une locale inconnue, même suivie d’un segment de section valide', () => {
    // `/de/projects` n'existe dans aucune langue : le garde `isLocale` rend une
    // 404. Et les segments de section sont indexés PAR locale, donc sans locale
    // valide il n'y a aucune table où chercher.
    expect(resolveSceneState('/de/projects')).toEqual(OVERVIEW)
  })

  it('⛔ une locale en majuscules — `/FR` n’est pas `/fr`', () => {
    expect(resolveSceneState('/FR/projects')).toEqual(OVERVIEW)
  })

  it('⛔ plus profond qu’une entité', () => {
    // `/{locale}/{section}/{slug}` est la route la plus profonde du site.
    expect(resolveSceneState('/fr/projects/augure/extra')).toEqual(OVERVIEW)
  })

  it('la racine, et la chaîne vide', () => {
    expect(resolveSceneState('/')).toEqual(OVERVIEW)
    expect(resolveSceneState('')).toEqual(OVERVIEW)
  })

  it('la page introuvable localisée, qui n’est pas une section', () => {
    expect(resolveSceneState('/fr/404')).toEqual(OVERVIEW)
  })

  it('une route non-page servie par la même origine', () => {
    expect(resolveSceneState('/fr/opengraph-image')).toEqual(OVERVIEW)
  })
})

describe('les bords de la découpe', () => {
  it('une barre finale ne change rien — elle ne nomme pas une entité vide', () => {
    expect(resolveSceneState('/fr/projects/')).toEqual({ focus: 'projects', detail: null })
    expect(resolveSceneState('/fr/')).toEqual(OVERVIEW)
  })

  it('une barre doublée n’est pas une route', () => {
    expect(resolveSceneState('/fr/projects//augure')).toEqual(OVERVIEW)
  })
})
