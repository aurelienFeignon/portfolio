/**
 * Métadonnées de page (P3-06) et `hreflang` (P3-07) — risque R-07.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { buildPageMetadata, pageMetadata } from '@/seo/metadata'
import type { PageLocation } from '@/routing/paths'

const SITE = new URL('https://exemple.test')

const HOME: PageLocation = { kind: 'home' }
const SECTION: PageLocation = { kind: 'section', section: 'projects' }
const ENTITY: PageLocation = { kind: 'entity', section: 'projects', slug: 'augure' }

function metadataFor(location: PageLocation, availableLocales?: readonly ('fr' | 'en')[]) {
  return buildPageMetadata(SITE, {
    locale: 'fr',
    location,
    title: 'Titre',
    description: 'Description',
    ...(availableLocales === undefined ? {} : { availableLocales }),
  })
}

describe('métadonnées de page', () => {
  it('reprend le titre et la description qu’on lui donne', () => {
    const metadata = metadataFor(HOME)

    expect(metadata.title).toBe('Titre')
    expect(metadata.description).toBe('Description')
  })

  describe('canonical', () => {
    it('désigne la page dans sa propre langue', () => {
      expect(metadataFor(ENTITY).alternates?.canonical).toBe(
        'https://exemple.test/fr/projects/augure',
      )
    })

    it('est absolu, sur l’origine configurée', () => {
      const canonical = metadataFor(SECTION).alternates?.canonical

      expect(String(canonical).startsWith('https://exemple.test/')).toBe(true)
    })

    it('ne désigne jamais l’autre langue', () => {
      // Une page qui se déclarerait canonique d'une autre se retirerait
      // elle-même de l'index.
      const french = buildPageMetadata(SITE, {
        locale: 'fr',
        location: ENTITY,
        title: 'x',
        description: 'y',
      })
      const english = buildPageMetadata(SITE, {
        locale: 'en',
        location: ENTITY,
        title: 'x',
        description: 'y',
      })

      expect(french.alternates?.canonical).not.toBe(english.alternates?.canonical)
      expect(String(english.alternates?.canonical)).toContain('/en/')
    })
  })

  describe('hreflang', () => {
    it('annonce les deux langues quand les deux existent', () => {
      expect(metadataFor(ENTITY, ['fr', 'en']).alternates?.languages).toEqual({
        fr: 'https://exemple.test/fr/projects/augure',
        en: 'https://exemple.test/en/projects/augure',
        'x-default': 'https://exemple.test/fr/projects/augure',
      })
    })

    it('n’annonce PAS une traduction absente (R-07)', () => {
      const languages = metadataFor(ENTITY, ['fr']).alternates?.languages

      expect(languages).toEqual({
        fr: 'https://exemple.test/fr/projects/augure',
        'x-default': 'https://exemple.test/fr/projects/augure',
      })
      expect(languages).not.toHaveProperty('en')
    })

    it('replie `x-default` sur la locale disponible quand le français manque', () => {
      const languages = metadataFor(ENTITY, ['en'])?.alternates?.languages

      // Un `x-default` vers une page absente est le même mensonge qu'un
      // `hreflang` vers une page absente.
      expect(languages?.['x-default']).toBe('https://exemple.test/en/projects/augure')
    })

    it('n’annonce rien du tout si la page n’existe dans aucune langue', () => {
      expect(metadataFor(ENTITY, []).alternates?.languages).toEqual({})
    })

    it('annonce les deux langues pour l’accueil et les sections, qui existent toujours', () => {
      expect(Object.keys(metadataFor(HOME).alternates?.languages ?? {})).toEqual([
        'fr',
        'en',
        'x-default',
      ])
      expect(Object.keys(metadataFor(SECTION).alternates?.languages ?? {})).toEqual([
        'fr',
        'en',
        'x-default',
      ])
    })

    it('inclut toujours la page courante dans ses propres alternatives', () => {
      // Une balise `hreflang` auto-référente est exigée par la spécification :
      // sans elle, le groupe d'alternatives n'est pas reconnu.
      const languages = metadataFor(ENTITY, ['fr', 'en']).alternates?.languages

      expect(languages?.['fr']).toBe(metadataFor(ENTITY, ['fr', 'en']).alternates?.canonical)
    })
  })

  it('respecte l’origine injectée, sans lire l’environnement', () => {
    const metadata = buildPageMetadata(new URL('http://localhost:3001'), {
      locale: 'en',
      location: SECTION,
      title: 'x',
      description: 'y',
    })

    expect(metadata.alternates?.canonical).toBe('http://localhost:3001/en/projects')
  })
})

describe('lecture de l’origine dans l’environnement', () => {
  const previous = process.env['SITE_URL']

  afterEach(() => {
    if (previous === undefined) delete process.env['SITE_URL']
    else process.env['SITE_URL'] = previous
  })

  it('construit les URL sur SITE_URL', () => {
    process.env['SITE_URL'] = 'https://depuis-lenvironnement.test'

    const metadata = pageMetadata({
      locale: 'fr',
      location: { kind: 'section', section: 'skills' },
      title: 'x',
      description: 'y',
    })

    expect(metadata.alternates?.canonical).toBe('https://depuis-lenvironnement.test/fr/skills')
  })

  it('échoue plutôt que de deviner quand SITE_URL est absente', () => {
    // Une origine devinée produit des `canonical` faux, c'est-à-dire une erreur
    // qui ne se voit qu'une fois le site indexé.
    delete process.env['SITE_URL']

    expect(() =>
      pageMetadata({ locale: 'fr', location: { kind: 'home' }, title: 'x', description: 'y' }),
    ).toThrow(/SITE_URL/)
  })
})
