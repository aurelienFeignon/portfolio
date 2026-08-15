/**
 * Composition des options du sélecteur de langue (P3-09).
 *
 * Ce module est la couture entre `src/routing` (qui sait où mène chaque langue)
 * et `src/ui` (qui sait l'afficher). Ce qui se teste ici est précisément ce que
 * ni l'un ni l'autre ne peut vérifier seul : que le composant reçoit **toujours**
 * une cible atteignable.
 */
import { describe, expect, it } from 'vitest'

import { languageOptions } from '@/app/[locale]/language-options'

const ENTITY = { kind: 'entity', section: 'projects', slug: 'augure' } as const

describe('options de langue', () => {
  it('propose toutes les locales, dans l’ordre déclaré', () => {
    expect(languageOptions({ kind: 'home' }).map((option) => option.locale)).toEqual(['fr', 'en'])
  })

  it('mène à la même entité quand elle est traduite', () => {
    expect(languageOptions(ENTITY, ['fr', 'en'])).toEqual([
      { locale: 'fr', href: '/fr/projects/augure', translated: true },
      { locale: 'en', href: '/en/projects/augure', translated: true },
    ])
  })

  it('mène au repli quand elle ne l’est pas, et le signale', () => {
    expect(languageOptions(ENTITY, ['fr'])).toEqual([
      { locale: 'fr', href: '/fr/projects/augure', translated: true },
      { locale: 'en', href: '/en/projects', translated: false },
    ])
  })

  it('ne rend jamais de cible vide, quelles que soient les locales disponibles', () => {
    for (const available of [[], ['fr'], ['en'], ['fr', 'en']] as const) {
      for (const option of languageOptions(ENTITY, available)) {
        expect(option.href).toMatch(/^\/(fr|en)\//)
      }
    }
  })
})
