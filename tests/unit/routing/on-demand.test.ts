/**
 * L'exception nommée des pages rendues à la demande (P10-06) et l'adresse de la page de contact.
 *
 * Le gate de rendu statique confronte cette liste au build ; ce test en épingle la forme, pour
 * qu'un élargissement de l'exception soit une décision visible et non une ligne de plus.
 */
import { describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/locales'
import { ON_DEMAND_PAGES } from '@/routing/on-demand'
import { contactPath } from '@/routing/paths'

describe('contactPath', () => {
  it('rend la page de contact sous la locale, même segment dans les deux langues', () => {
    expect(contactPath('fr')).toBe('/fr/contact')
    expect(contactPath('en')).toBe('/en/contact')
  })
})

describe('ON_DEMAND_PAGES', () => {
  it('ne nomme que la page de contact, dans chaque locale', () => {
    expect(ON_DEMAND_PAGES).toEqual([
      { route: '/[locale]/contact', paths: LOCALES.map(contactPath) },
    ])
  })
})
