/**
 * Dictionnaires d'interface (P3-04) — `testing-strategy.md` §4.2.
 *
 * La **complétude** n'est pas testée ici : elle est garantie par le compilateur
 * (`en.ts` est annoté `: Messages`), et une clé manquante fait échouer `tsc`
 * avant que cette suite ne démarre. Le vérifier en test serait redondant, et
 * surtout plus faible — un test se contourne par un `skip`, pas `tsc`.
 *
 * Ce que ces tests couvrent est ce que le compilateur ne voit pas : une clé
 * **présente mais vide**, ou une traduction restée en français.
 */
import { describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'

/** Aplatit le dictionnaire en couples `chemin → valeur`, quelle que soit sa profondeur. */
function flatten(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === 'string') return [[path.join('.'), value]]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, [...path, key]),
  )
}

describe('dictionnaires', () => {
  it('rend un dictionnaire pour chaque locale déclarée', () => {
    for (const locale of LOCALES) {
      expect(getMessages(locale)).toBeDefined()
    }
  })

  it.each(LOCALES)('n’a aucune clé vide en « %s »', (locale) => {
    const empty = flatten(getMessages(locale))
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key)

    expect(empty).toEqual([])
  })

  it('couvre exactement les mêmes clés dans les deux locales', () => {
    // Le compilateur l'impose déjà ; ce test le constate à l'exécution, ce qui
    // protège du jour où une locale serait construite dynamiquement.
    const keysOf = (locale: (typeof LOCALES)[number]) =>
      flatten(getMessages(locale))
        .map(([key]) => key)
        .sort()

    expect(keysOf('en')).toEqual(keysOf('fr'))
  })

  it('ne laisse aucune valeur anglaise identique au français par oubli de traduction', () => {
    const fr = new Map(flatten(getMessages('fr')))
    const untranslated = flatten(getMessages('en'))
      .filter(([key, value]) => fr.get(key) === value)
      .map(([key]) => key)
      // Trié : sans cela, l'assertion dépendrait de l'ordre de déclaration des
      // blocs dans `en.ts`, qu'un simple réagencement casserait.
      .sort()

    // Deux exceptions, et **seulement** deux, chacune pour une raison écrite à
    // la source :
    //
    // - `site.name` est un **nom propre** — depuis P4-02, l'exception est
    //   structurelle et non plus fortuite comme elle l'était pour « Portfolio » ;
    // - `skills.categories.infrastructure` est le mot juste dans les deux
    //   langues. La règle du dépôt est de chercher **d'abord** la formulation
    //   idiomatique — c'est ainsi que « Technologies » est devenu « Tech stack »
    //   en P4-04, et « Frameworks » « Frameworks & libraries » ici. L'exception
    //   est le dernier recours, et elle sert quand dégrader le libellé serait le
    //   seul moyen de satisfaire ce test.
    //
    // Toute autre égalité est un oubli de traduction.
    expect(untranslated).toEqual(['site.name', 'skills.categories.infrastructure'])
  })

  it('aplatit correctement les dictionnaires imbriqués', () => {
    // Sans quoi les trois tests ci-dessus passeraient sur un tableau vide.
    expect(flatten(getMessages('fr'))).toContainEqual([
      'skipToContent',
      'Aller au contenu principal',
    ])
    expect(flatten(getMessages('fr')).length).toBeGreaterThan(10)
  })
})
