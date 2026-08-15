/**
 * La même page dans les autres langues (P3-07 à P3-09) — risque R-07.
 */
import { describe, expect, it } from 'vitest'

import { localeAlternates, translatedAlternates } from '@/routing/alternates'
import type { PageLocation } from '@/routing/paths'

const HOME: PageLocation = { kind: 'home' }
const SECTION: PageLocation = { kind: 'section', section: 'projects' }
const ENTITY: PageLocation = { kind: 'entity', section: 'projects', slug: 'augure' }

describe('alternatives de locale', () => {
  it('donne une entrée par locale déclarée, dans l’ordre de LOCALES', () => {
    expect(localeAlternates(HOME).map((alternate) => alternate.locale)).toEqual(['fr', 'en'])
  })

  it('conserve cet ordre quel que soit celui des locales disponibles', () => {
    // Sinon le sitemap et les balises `hreflang` changeraient d'ordre d'un build
    // à l'autre, produisant un diff qui ne dit rien.
    const alternates = localeAlternates(ENTITY, ['en', 'fr'])
    expect(alternates.map((alternate) => alternate.locale)).toEqual(['fr', 'en'])
  })

  describe('pages qui existent toujours', () => {
    it.each([
      ['accueil', HOME, ['/fr', '/en']],
      ['section', SECTION, ['/fr/projects', '/en/projects']],
    ])('%s : les deux locales sont traduites', (_name, location, expected) => {
      const alternates = localeAlternates(location as PageLocation)

      expect(alternates.map((alternate) => alternate.path)).toEqual(expected)
      expect(alternates.every((alternate) => alternate.translated)).toBe(true)
    })
  })

  describe('entité traduite dans les deux langues', () => {
    const alternates = localeAlternates(ENTITY, ['fr', 'en'])

    it('rend un chemin par locale, chacun désignant sa propre page', () => {
      expect(alternates.map((alternate) => alternate.path)).toEqual([
        '/fr/projects/augure',
        '/en/projects/augure',
      ])
    })

    it('n’a pas besoin de repli', () => {
      for (const alternate of alternates) {
        expect(alternate.fallbackPath).toBe(alternate.path)
      }
    })
  })

  describe('entité absente d’une locale (R-07)', () => {
    const alternates = localeAlternates(ENTITY, ['fr'])
    const english = alternates.find((alternate) => alternate.locale === 'en')

    it('n’annonce aucun chemin vers la page inexistante', () => {
      expect(english?.path).toBeNull()
      expect(english?.translated).toBe(false)
    })

    it('offre malgré tout un repli vers la section, qui existe', () => {
      // Un lien absent priverait le visiteur du seul moyen de changer de langue
      // sur cette page ; un lien vers la page inexistante l'enverrait en 404.
      expect(english?.fallbackPath).toBe('/en/projects')
    })

    it('laisse la locale présente intacte', () => {
      const french = alternates.find((alternate) => alternate.locale === 'fr')
      expect(french?.path).toBe('/fr/projects/augure')
      expect(french?.translated).toBe(true)
    })
  })

  describe('ce qu’un hreflang et un sitemap ont le droit d’annoncer', () => {
    it('ne retient que les locales réellement présentes', () => {
      expect(translatedAlternates(ENTITY, ['fr']).map((alternate) => alternate.path)).toEqual([
        '/fr/projects/augure',
      ])
    })

    it('retient les deux quand les deux existent', () => {
      expect(translatedAlternates(ENTITY, ['fr', 'en'])).toHaveLength(2)
    })

    it('ne rend rien si l’entité n’existe nulle part', () => {
      expect(translatedAlternates(ENTITY, [])).toEqual([])
    })

    it('n’annonce jamais un chemin nul', () => {
      for (const alternate of translatedAlternates(ENTITY, ['fr'])) {
        expect(alternate.path).not.toBeNull()
      }
    })
  })
})
