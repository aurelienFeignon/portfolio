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
  pathFor,
  sectionPath,
} from '@/routing/paths'
import { SECTIONS } from '@/routing/sections'

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
