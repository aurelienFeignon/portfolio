/**
 * Sitemap (P3-08) — `testing-strategy.md` §4.6 : « contient exactement les
 * entités existantes, avec les bons `alternates` ».
 */
import { describe, expect, it } from 'vitest'

import { LOCALES, type Locale } from '@/i18n/locales'
import { buildPageMetadata } from '@/seo/metadata'
import { buildSitemap, entitySitemapPages } from '@/seo/sitemap'

const SITE = new URL('https://exemple.test')

describe('sitemap', () => {
  it('rend une entrée par page réellement servie, pas une par entité', () => {
    // `/fr/projects/augure` et `/en/projects/augure` sont deux pages : une entrée
    // unique dirait à un moteur qu'il n'y en a qu'une.
    const entries = buildSitemap(SITE, [
      {
        location: { kind: 'entity', section: 'projects', slug: 'augure' },
        availableLocales: LOCALES,
      },
    ])

    expect(entries.map((entry) => entry.url)).toEqual([
      'https://exemple.test/fr/projects/augure',
      'https://exemple.test/en/projects/augure',
    ])
  })

  it('donne à chaque entrée toutes les versions existantes, y compris la sienne', () => {
    const [french] = buildSitemap(SITE, [
      {
        location: { kind: 'entity', section: 'projects', slug: 'augure' },
        availableLocales: LOCALES,
      },
    ])

    expect(french?.alternates?.languages).toEqual({
      fr: 'https://exemple.test/fr/projects/augure',
      en: 'https://exemple.test/en/projects/augure',
      'x-default': 'https://exemple.test/fr/projects/augure',
    })
  })

  it('n’inscrit pas une entité absente d’une locale (R-07)', () => {
    const entries = buildSitemap(SITE, [
      {
        location: { kind: 'entity', section: 'projects', slug: 'augure' },
        availableLocales: ['fr'],
      },
    ])

    expect(entries.map((entry) => entry.url)).toEqual(['https://exemple.test/fr/projects/augure'])
    expect(entries[0]?.alternates?.languages).toEqual({
      fr: 'https://exemple.test/fr/projects/augure',
      'x-default': 'https://exemple.test/fr/projects/augure',
    })
  })

  it('annonce exactement les mêmes alternatives que les balises de la page', () => {
    // Les deux canaux disent la même chose au même moteur de recherche. Les
    // construire séparément, c'est les laisser diverger — ce qui était arrivé :
    // le sitemap omettait le `x-default` que les métadonnées émettaient toujours.
    const combinations: readonly (readonly Locale[])[] = [LOCALES, ['fr'], ['en'], []]

    for (const availableLocales of combinations) {
      const page = {
        location: { kind: 'entity', section: 'projects', slug: 'augure' },
        availableLocales,
      } as const

      const fromSitemap = buildSitemap(SITE, [page])[0]?.alternates?.languages
      const fromMetadata = buildPageMetadata(SITE, {
        locale: 'fr',
        location: page.location,
        title: 'x',
        description: 'y',
        availableLocales,
        site: {
          name: 'Aurélien Feignon',
          description: 'Portfolio du site',
          titleTemplate: '%s — Aurélien Feignon',
        },
      }).alternates?.languages

      // Une entité absente partout ne produit aucune entrée de sitemap : il n'y
      // a alors rien à comparer, et c'est correct.
      if (fromSitemap !== undefined) expect(fromSitemap).toEqual(fromMetadata)
    }
  })

  it('n’inscrit rien pour une entité qui n’existe nulle part', () => {
    expect(
      buildSitemap(SITE, [
        {
          location: { kind: 'entity', section: 'projects', slug: 'fantome' },
          availableLocales: [],
        },
      ]),
    ).toEqual([])
  })

  it('inscrit l’accueil et les sections dans les deux langues', () => {
    const entries = buildSitemap(SITE, [
      { location: { kind: 'home' }, availableLocales: LOCALES },
      { location: { kind: 'section', section: 'skills' }, availableLocales: LOCALES },
    ])

    expect(entries.map((entry) => entry.url)).toEqual([
      'https://exemple.test/fr',
      'https://exemple.test/en',
      'https://exemple.test/fr/skills',
      'https://exemple.test/en/skills',
    ])
  })

  it('conserve l’ordre des pages qu’on lui donne', () => {
    // Un sitemap qui change d'ordre d'un build à l'autre produit un diff qui ne
    // dit rien, et masque les vraies apparitions ou disparitions.
    const pages = [
      { location: { kind: 'section', section: 'projects' }, availableLocales: LOCALES },
      { location: { kind: 'home' }, availableLocales: LOCALES },
    ] as const

    expect(buildSitemap(SITE, pages)[0]?.url).toBe('https://exemple.test/fr/projects')
  })

  it('n’inscrit aucune URL relative', () => {
    for (const entry of buildSitemap(SITE, [
      { location: { kind: 'home' }, availableLocales: LOCALES },
    ])) {
      expect(entry.url.startsWith('https://exemple.test/')).toBe(true)
    }
  })
})

describe('pages de détail d’une section', () => {
  it('prend l’union des slugs, pas leur intersection', () => {
    // Une entité qui n'existe qu'en français doit figurer au sitemap. Lire une
    // seule locale la ferait disparaître de l'index, en silence.
    const pages = entitySitemapPages('projects', { fr: ['augure', 'portfolio'], en: ['augure'] })

    expect(pages.map((page) => page.location)).toEqual([
      { kind: 'entity', section: 'projects', slug: 'augure' },
      { kind: 'entity', section: 'projects', slug: 'portfolio' },
    ])
  })

  it('déduit les locales disponibles des listes qu’on lui donne', () => {
    const pages = entitySitemapPages('projects', { fr: ['augure', 'portfolio'], en: ['augure'] })

    expect(pages.map((page) => page.availableLocales)).toEqual([['fr', 'en'], ['fr']])
  })

  it('trie les slugs, pour que le sitemap ne change pas d’ordre d’un build à l’autre', () => {
    const pages = entitySitemapPages('experiences', { fr: ['zeta', 'alpha'], en: ['mu'] })

    expect(pages.map((page) => page.location)).toEqual([
      { kind: 'entity', section: 'experiences', slug: 'alpha' },
      { kind: 'entity', section: 'experiences', slug: 'mu' },
      { kind: 'entity', section: 'experiences', slug: 'zeta' },
    ])
  })

  it('rend les locales dans l’ordre déclaré, pas dans celui de l’objet reçu', () => {
    const pages = entitySitemapPages('projects', { en: ['augure'], fr: ['augure'] })

    expect(pages[0]?.availableLocales).toEqual(['fr', 'en'])
  })

  it('ne rend rien quand aucune locale n’a de contenu', () => {
    expect(entitySitemapPages('projects', {})).toEqual([])
    expect(entitySitemapPages('projects', { fr: [], en: [] })).toEqual([])
  })

  it('produit un sitemap exact une fois combiné', () => {
    const entries = buildSitemap(
      SITE,
      entitySitemapPages('projects', { fr: ['augure', 'portfolio'], en: ['augure'] }),
    )

    expect(entries.map((entry) => entry.url)).toEqual([
      'https://exemple.test/fr/projects/augure',
      'https://exemple.test/en/projects/augure',
      'https://exemple.test/fr/projects/portfolio',
    ])
  })
})
