/**
 * Construction des chemins (P3-05) — `testing-strategy.md` §4.2.
 */
import { describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/locales'
import { entityPath, fallbackLocation, homePath, pathFor, sectionPath } from '@/routing/paths'
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
