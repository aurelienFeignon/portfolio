/**
 * Construction des chemins (P3-05) — `testing-strategy.md` §4.2.
 */
import { describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, LOCALES } from '@/i18n/locales'
import {
  displayedLocale,
  entityPath,
  fallbackLocation,
  homePath,
  localeFromPathname,
  parsePagePath,
  pathFor,
  sectionPath,
  withoutTrailingSlash,
} from '@/routing/paths'
import { SECTIONS, SECTIONS_WITH_DETAIL, isSectionWithDetail } from '@/routing/sections'

describe('chemins', () => {
  it('construit la racine de chaque locale', () => {
    expect(homePath('fr')).toBe('/fr')
    expect(homePath('en')).toBe('/en')
  })

  it('construit le chemin d’une section', () => {
    expect(sectionPath('fr', 'projects')).toBe('/fr/projects')
    expect(sectionPath('en', 'experiences')).toBe('/en/experiences')
    expect(sectionPath('en', 'skills')).toBe('/en/skills')
  })

  it('construit le chemin d’une entité', () => {
    expect(entityPath('fr', 'projects', 'augure')).toBe('/fr/projects/augure')
    expect(entityPath('en', 'experiences', 'evea')).toBe('/en/experiences/evea')
  })

  it('résout deux locales vers deux chemins distincts pour la même entité', () => {
    // C'est la propriété que le critère de sortie de la phase exige : les deux
    // versions d'une entité sont deux URL, pas deux vues de la même.
    expect(entityPath('fr', 'projects', 'augure')).not.toBe(entityPath('en', 'projects', 'augure'))
  })

  describe('propriétés vraies de tout chemin', () => {
    const everyPath = [
      ...LOCALES.map((locale) => homePath(locale)),
      ...LOCALES.flatMap((locale) => SECTIONS.map((section) => sectionPath(locale, section))),
      ...LOCALES.flatMap((locale) =>
        SECTIONS.map((section) => entityPath(locale, section, 'augure')),
      ),
    ]

    it.each(everyPath)('« %s » commence par un slash unique', (path) => {
      expect(path.startsWith('/')).toBe(true)
      expect(path.startsWith('//')).toBe(false)
    })

    it.each(everyPath)('« %s » ne contient aucun double slash', (path) => {
      expect(path).not.toContain('//')
    })

    it.each(everyPath)('« %s » ne se termine pas par un slash', (path) => {
      // Une URL canonique qui traîne un slash final désigne une **autre** URL
      // que celle que sert le serveur : c'est du contenu dupliqué à l'index.
      expect(path.endsWith('/')).toBe(false)
    })
  })

  describe('échappement du slug', () => {
    it('encode ce qui ne peut pas figurer tel quel dans un chemin', () => {
      expect(entityPath('fr', 'projects', 'a b')).toBe('/fr/projects/a%20b')
      expect(entityPath('fr', 'projects', 'a/b')).toBe('/fr/projects/a%2Fb')
    })

    it('laisse intact un slug conforme au schéma de contenu', () => {
      // Le motif de slug (P2-02) n'autorise que minuscules, chiffres et traits
      // d'union : l'encodage y est l'identité, et doit le rester.
      expect(entityPath('fr', 'projects', 'mon-projet-2')).toBe('/fr/projects/mon-projet-2')
    })
  })
})

/**
 * L'opération inverse de `homePath` (P4-07). Trois appelants la posent — le
 * proxy et les deux frontières d'erreur —, et chacun décide **seul** de ce qu'il
 * fait quand il n'y a pas de locale : c'est la lecture qui est partagée, pas le
 * repli.
 */
describe('locale portée par un chemin', () => {
  it.each([
    ['/fr', 'fr'],
    ['/en', 'en'],
    ['/fr/projects', 'fr'],
    ['/en/projects/portfolio', 'en'],
    ['/fr/', 'fr'],
  ])('lit « %s » comme %s', (pathname, expected) => {
    expect(localeFromPathname(pathname)).toBe(expected)
  })

  it.each([
    ['une locale inconnue', '/de/projects'],
    ['aucune locale', '/rien'],
    ['la racine', '/'],
    ['la casse inverse — une locale est un segment exact', '/FR/projects'],
    ['un préfixe qui ressemble', '/french/projects'],
    ['la chaîne vide', ''],
  ])('ne trouve pas de locale dans %s', (_label, pathname) => {
    // `null` et non la locale par défaut : rendre un repli ici priverait le
    // proxy de la négociation `Accept-Language`, qui est son travail.
    expect(localeFromPathname(pathname)).toBeNull()
  })

  it('rend une locale pour tout chemin que le site construit', () => {
    // La propriété d'aller-retour : ce que `homePath` écrit, ceci le relit.
    for (const locale of LOCALES) {
      expect(localeFromPathname(homePath(locale))).toBe(locale)
      for (const section of SECTIONS) {
        expect(localeFromPathname(sectionPath(locale, section))).toBe(locale)
      }
    }
  })

  describe('langue à afficher quand on n’a que l’URL', () => {
    it('suit l’URL quand elle porte une locale', () => {
      expect(displayedLocale('/en/projects')).toBe('en')
      expect(displayedLocale('/fr')).toBe('fr')
    })

    it('retombe sur la locale par défaut, plutôt que sur rien', () => {
      // Les frontières d'erreur n'ont pas d'`Accept-Language` à négocier : sans
      // ce repli, `<html lang>` serait absent au moment précis où la page est
      // déjà dégradée.
      expect(displayedLocale('/de/projects')).toBe(DEFAULT_LOCALE)
      expect(displayedLocale('/rien')).toBe(DEFAULT_LOCALE)
      expect(displayedLocale('/')).toBe(DEFAULT_LOCALE)
    })
  })
})

describe('page la plus proche quand une langue manque', () => {
  it('replie une entité sur sa section', () => {
    expect(fallbackLocation({ kind: 'entity', section: 'projects', slug: 'augure' })).toEqual({
      kind: 'section',
      section: 'projects',
    })
  })

  it('laisse une section et l’accueil inchangés : ils existent dans toutes les langues', () => {
    const section = { kind: 'section', section: 'skills' } as const
    const home = { kind: 'home' } as const

    expect(fallbackLocation(section)).toBe(section)
    expect(fallbackLocation(home)).toBe(home)
  })

  it('rend un emplacement toujours constructible', () => {
    for (const location of [
      { kind: 'home' },
      { kind: 'section', section: 'projects' },
      { kind: 'entity', section: 'projects', slug: 'augure' },
    ] as const) {
      expect(pathFor('en', fallbackLocation(location))).toMatch(/^\/en/)
    }
  })
})

describe('forme canonique d’un chemin', () => {
  it('retire la barre finale — elle désigne la même page', () => {
    expect(withoutTrailingSlash('/fr/projects/')).toBe('/fr/projects')
    expect(withoutTrailingSlash('/fr/projects/augure/')).toBe('/fr/projects/augure')
  })

  it('ne touche pas à un chemin déjà canonique', () => {
    expect(withoutTrailingSlash('/fr/projects')).toBe('/fr/projects')
  })

  it('⛔ n’en retire qu’UNE, comme le proxy', () => {
    // `/fr/projects//` n'est servi nulle part : en absorber deux ferait dire à la
    // scène qu'une page existe là où le proxy réécrit une 404.
    expect(withoutTrailingSlash('/fr/projects//')).toBe('/fr/projects/')
  })
})

describe('ce qu’un chemin désigne — l’inverse de `pathFor`', () => {
  it('l’accueil', () => {
    expect(parsePagePath('/fr')).toEqual({ locale: 'fr', location: { kind: 'home' } })
  })

  it('une section', () => {
    expect(parsePagePath('/en/projects')).toEqual({
      locale: 'en',
      location: { kind: 'section', section: 'projects' },
    })
  })

  it('une entité', () => {
    expect(parsePagePath('/en/projects/augure')).toEqual({
      locale: 'en',
      location: { kind: 'entity', section: 'projects', slug: 'augure' },
    })
  })

  it('⭐ l’aller-retour : ce que `pathFor` écrit, ceci le relit', () => {
    // La propriété que `testing-strategy.md` §4.3 exige de la Phase 6, éprouvée
    // ici sur `routing` seul — là où les deux sens vivent.
    for (const locale of LOCALES) {
      const lieux = [
        { kind: 'home' } as const,
        ...SECTIONS.map((section) => ({ kind: 'section', section }) as const),
        ...SECTIONS_WITH_DETAIL.map(
          (section) => ({ kind: 'entity', section, slug: 'peu-importe' }) as const,
        ),
      ]

      for (const location of lieux) {
        expect(parsePagePath(pathFor(locale, location))).toEqual({ locale, location })
      }
    }
  })

  it('décode le slug, parce que `entityPath` l’encode', () => {
    const chemin = entityPath('fr', 'projects', 'été 2026')

    expect(chemin).not.toContain('é')
    expect(parsePagePath(chemin)).toEqual({
      locale: 'fr',
      location: { kind: 'entity', section: 'projects', slug: 'été 2026' },
    })
  })

  it('⛔ un échappement impossible retombe sur la SECTION, et ne jette pas', () => {
    // `%E0%A4%A` est tronqué : aucun encodage ne l'a produit, donc il ne nomme
    // aucune entité. La section, elle, est bien servie.
    expect(parsePagePath('/fr/projects/%E0%A4%A')).toEqual({
      locale: 'fr',
      location: { kind: 'section', section: 'projects' },
    })
  })

  it('une barre finale désigne la même page, derrière une section comme derrière un slug', () => {
    expect(parsePagePath('/fr/projects/')).toEqual(parsePagePath('/fr/projects'))
    expect(parsePagePath('/fr/projects/augure/')).toEqual(parsePagePath('/fr/projects/augure'))
    expect(parsePagePath('/fr/')).toEqual(parsePagePath('/fr'))
  })

  it('⛔ une fiche sous une section qui n’en a pas n’est servie nulle part', () => {
    // Le périmètre est DÉRIVÉ : une quatrième section sans fiche est couverte
    // sans que personne y pense.
    for (const section of SECTIONS) {
      const chemin = entityPath('fr', section, 'peu-importe')

      if (isSectionWithDetail(section)) expect(parsePagePath(chemin)).not.toBeNull()
      else expect(parsePagePath(chemin)).toBeNull()
    }
  })

  it('nommément : une compétence n’a pas de page en v1', () => {
    expect(parsePagePath('/fr/skills/typescript')).toBeNull()
    expect(parsePagePath('/fr/skills')).not.toBeNull()
  })

  it.each([
    ['une locale inconnue, même suivie d’une section valide', '/de/projects'],
    ['la casse — `/FR` n’est pas `/fr`', '/FR/projects'],
    ['un segment de section inconnu', '/fr/inconnu'],
    ['la page introuvable localisée, qui n’est pas une section', '/fr/404'],
    ['une route non-page servie par la même origine', '/fr/opengraph-image'],
    ['plus profond qu’une entité', '/fr/projects/augure/extra'],
    ['une barre doublée, qui n’est pas une route', '/fr/projects//augure'],
    ['la racine', '/'],
    ['la chaîne vide', ''],
  ])('ne désigne aucune page : %s', (_label, pathname) => {
    expect(parsePagePath(pathname)).toBeNull()
  })
})
