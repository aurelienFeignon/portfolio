/**
 * Métadonnées de page (P3-06) et `hreflang` (P3-07) — risque R-07.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { LOCALES, type Locale } from '@/i18n/locales'
import { buildPageMetadata, pageMetadata } from '@/seo/metadata'
import type { PageLocation } from '@/routing/paths'

const SITE = new URL('https://exemple.test')

/** Ce que `src/seo` reçoit du dictionnaire, qu'il n'a pas le droit de lire. */
const SITE_MESSAGES = { name: 'Aurélien Feignon', titleTemplate: '%s — Aurélien Feignon' }

const HOME: PageLocation = { kind: 'home' }
const SECTION: PageLocation = { kind: 'section', section: 'projects' }
const ENTITY: PageLocation = { kind: 'entity', section: 'projects', slug: 'augure' }

function metadataFor(location: PageLocation, availableLocales: readonly Locale[] = LOCALES) {
  return buildPageMetadata(SITE, {
    locale: 'fr',
    location,
    title: 'Titre',
    description: 'Description',
    availableLocales,
    site: SITE_MESSAGES,
  })
}

describe('métadonnées de page', () => {
  it('reprend le titre et la description qu’on lui donne', () => {
    const metadata = metadataFor(SECTION)

    expect(metadata.title).toBe('Titre')
    expect(metadata.description).toBe('Description')
  })

  describe('gabarit de titre (P4-08)', () => {
    it('laisse le gabarit du layout compléter le titre d’une section', () => {
      // Une chaîne nue **est** ce que Next passe au `template` du parent : c'est
      // ainsi que « Projets » devient « Projets — Aurélien Feignon », sans que
      // chaque page ait à connaître le suffixe.
      expect(metadataFor(SECTION).title).toBe('Titre')
      expect(metadataFor(ENTITY).title).toBe('Titre')
    })

    it('rend le titre de l’accueil **absolu**', () => {
      // Sinon le gabarit s'applique à lui aussi et la page d'accueil s'appelle
      // « Aurélien Feignon — Aurélien Feignon ».
      expect(metadataFor(HOME).title).toEqual({ absolute: 'Titre' })
    })

    it('déduit ce cas de l’emplacement, sans le demander à l’appelant', () => {
      // L'accueil est le seul endroit où le titre **est** le nom du site. Le
      // faire déclarer par chaque page serait une occasion de l'oublier, et
      // l'oubli ne casserait rien de visible — juste un titre qui bégaie.
      const home = metadataFor(HOME)
      const section = metadataFor(SECTION)

      expect(typeof home.title).toBe('object')
      expect(typeof section.title).toBe('string')
    })
  })

  describe('OpenGraph (P4-08)', () => {
    it('annonce l’URL canonique, et non une autre', () => {
      // Un `og:url` qui désignerait une autre page ferait pointer chaque partage
      // ailleurs que sur ce qu'on partage.
      const metadata = metadataFor(SECTION)

      expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical)
    })

    it('reprend le titre **complété par le gabarit**, pas le titre nu', () => {
      // Un partage ne descend pas d'un layout : `og:title` est lu tel quel par
      // le consommateur, et « Projets » seul ne dit pas de qui.
      expect(metadataFor(SECTION).openGraph?.title).toBe('Titre — Aurélien Feignon')
    })

    it('n’applique pas le gabarit deux fois à l’accueil', () => {
      expect(metadataFor(HOME).openGraph?.title).toBe('Titre')
    })

    it('déclare la langue de la page, et les autres comme alternatives', () => {
      const openGraph = metadataFor(ENTITY)

      expect(openGraph.openGraph?.locale).toBe('fr_FR')
      expect(openGraph.openGraph?.alternateLocale).toEqual(['en_US'])
    })

    it('n’annonce comme alternative que les langues où la page existe', () => {
      // Même exigence que le `hreflang` (R-07) : une alternative vers une
      // traduction absente est une promesse fausse, sur un autre canal.
      expect(metadataFor(ENTITY, ['fr']).openGraph?.alternateLocale).toEqual([])
    })

    it('porte le nom du site et le type', () => {
      const { openGraph } = metadataFor(SECTION)

      expect(openGraph?.siteName).toBe('Aurélien Feignon')
      expect(openGraph).toMatchObject({ type: 'website' })
    })

    describe('image de partage', () => {
      it('est annoncée explicitement, et dans la langue de la page', () => {
        // ⛔ Next l'attache tout seul **tant que la page ne déclare pas
        // d'`openGraph`** ; dès qu'elle en déclare un, il remplace celui du
        // parent, image comprise. Le premier build servait donc une image que
        // rien ne référençait.
        expect(metadataFor(SECTION).openGraph?.images).toEqual([
          {
            url: 'https://exemple.test/fr/opengraph-image',
            width: 1200,
            height: 630,
            alt: 'Aurélien Feignon — Description',
          },
        ])
      })

      it('désigne l’image de **sa** langue', () => {
        const english = buildPageMetadata(SITE, {
          locale: 'en',
          location: SECTION,
          title: 'Titre',
          description: 'Description',
          availableLocales: LOCALES,
          site: SITE_MESSAGES,
        })

        expect(JSON.stringify(english.openGraph?.images)).toContain('/en/opengraph-image')
      })

      it('accompagne aussi la carte Twitter', () => {
        // Deux consommateurs, une seule image : les laisser diverger donnerait
        // une vignette sur un réseau et pas sur l'autre.
        const metadata = metadataFor(SECTION)

        expect(metadata.twitter).toMatchObject({ images: metadata.openGraph?.images })
      })
    })

    it('déclare une carte Twitter à grande image', () => {
      expect(metadataFor(SECTION).twitter).toMatchObject({ card: 'summary_large_image' })
    })
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
        availableLocales: LOCALES,
        site: SITE_MESSAGES,
      })
      const english = buildPageMetadata(SITE, {
        locale: 'en',
        location: ENTITY,
        title: 'x',
        description: 'y',
        availableLocales: LOCALES,
        site: SITE_MESSAGES,
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
      availableLocales: LOCALES,
      site: SITE_MESSAGES,
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
      availableLocales: LOCALES,
      site: SITE_MESSAGES,
    })

    expect(metadata.alternates?.canonical).toBe('https://depuis-lenvironnement.test/fr/skills')
  })

  it('échoue plutôt que de deviner quand SITE_URL est absente', () => {
    // Une origine devinée produit des `canonical` faux, c'est-à-dire une erreur
    // qui ne se voit qu'une fois le site indexé.
    delete process.env['SITE_URL']

    expect(() =>
      pageMetadata({
        locale: 'fr',
        location: { kind: 'home' },
        title: 'x',
        description: 'y',
        availableLocales: LOCALES,
        site: SITE_MESSAGES,
      }),
    ).toThrow(/SITE_URL/)
  })
})
