/**
 * Composition des métadonnées de page (P3-06, P3-07).
 *
 * Ces deux fonctions ont été extraites des routes en revue : la première parce
 * que trois pages de section écrivaient le nom de la section **deux fois** sans
 * que rien ne relie les deux, la seconde parce que passer `getContentLocales` à
 * `pageMetadata` est **la** décision dont R-07 dépend — et qu'elle vivait dans un
 * fichier exclu de la couverture.
 */
import { describe, expect, it } from 'vitest'

import { entityMetadata, sectionMetadata } from '@/app/[locale]/page-metadata'
import type { ContentRepository } from '@/content/repository'
import type { Locale } from '@/i18n/locales'

import { freezeSiteUrl } from '../../fixtures/site-url'

const ORIGIN = 'https://exemple.test'

freezeSiteUrl(ORIGIN)

const params = (locale: string) => Promise.resolve({ locale })

describe('métadonnées d’une page de section', () => {
  it('dérive le titre, la description et l’URL du **même** argument', () => {
    // C'est tout l'objet de l'extraction : écrire `projects` dans l'emplacement
    // et lire `skills` dans les messages compilait, et aucun test ne l'attrapait.
    expect(sectionMetadata('projects')).toBeTypeOf('function')
  })

  it('rend le libellé et la description de la section, dans la langue de la page', async () => {
    const french = await sectionMetadata('projects')({ params: params('fr') })
    const english = await sectionMetadata('projects')({ params: params('en') })

    expect(french.title).toBe('Projets')
    expect(english.title).toBe('Projects')
    expect(french.description).not.toBe(english.description)
  })

  it('désigne l’URL de la section dans la langue de la page', async () => {
    const metadata = await sectionMetadata('skills')({ params: params('en') })

    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/en/skills`)
  })

  it('annonce les deux langues : une section existe partout, même vide (R-07)', async () => {
    const metadata = await sectionMetadata('experiences')({ params: params('fr') })

    expect(metadata.alternates?.languages).toEqual({
      fr: `${ORIGIN}/fr/experiences`,
      en: `${ORIGIN}/en/experiences`,
      'x-default': `${ORIGIN}/fr/experiences`,
    })
  })

  it('refuse une locale inconnue', async () => {
    await expect(sectionMetadata('projects')({ params: params('de') })).rejects.toThrow()
  })
})

describe('métadonnées d’une page de détail', () => {
  /** Un dépôt réduit à ce que la fonction consulte : les locales d'une entité. */
  const repositoryWith = (locales: readonly Locale[]) =>
    ({ getContentLocales: async () => locales }) as unknown as ContentRepository

  const metadataFor = (locales: readonly Locale[]) =>
    entityMetadata(repositoryWith(locales), {
      locale: 'fr',
      section: 'projects',
      slug: 'augure',
      title: 'Augure',
      description: 'Une plateforme.',
    })

  it('reprend le titre et la description de l’entité', async () => {
    const metadata = await metadataFor(['fr', 'en'])

    expect(metadata.title).toBe('Augure')
    expect(metadata.description).toBe('Une plateforme.')
  })

  it('annonce exactement les locales où l’entité existe (R-07)', async () => {
    expect((await metadataFor(['fr', 'en'])).alternates?.languages).toEqual({
      fr: `${ORIGIN}/fr/projects/augure`,
      en: `${ORIGIN}/en/projects/augure`,
      'x-default': `${ORIGIN}/fr/projects/augure`,
    })
  })

  it('n’annonce pas une traduction absente', async () => {
    const languages = (await metadataFor(['fr'])).alternates?.languages

    expect(languages).not.toHaveProperty('en')
    expect(languages).toEqual({
      fr: `${ORIGIN}/fr/projects/augure`,
      'x-default': `${ORIGIN}/fr/projects/augure`,
    })
  })

  it('reste canonique d’elle-même quand elle n’existe que dans l’autre langue', async () => {
    // Cas dégénéré, mais il ne doit pas produire un `canonical` vers une page
    // que le dépôt vient de déclarer absente ici.
    const metadata = await metadataFor(['en'])

    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/fr/projects/augure`)
    expect(metadata.alternates?.languages).not.toHaveProperty('fr')
  })
})
