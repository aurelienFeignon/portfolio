/**
 * Composition des données structurées (P4-09).
 *
 * `src/seo/json-ld.ts` fabrique les nœuds ; ce module décide **lesquels une page
 * porte**, et va chercher ce qu'ils affirment — le dictionnaire pour les
 * libellés, le dépôt pour les compétences. C'est la seule décision à branches de
 * la tâche, et c'est pourquoi elle est ici plutôt que dans les six routes, qui
 * sont exclues de la couverture.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  homeStructuredData,
  projectStructuredData,
  sectionStructuredData,
  experienceStructuredData,
} from '@/app/[locale]/structured-data'
import type { ContentRepository } from '@/content/repository'
import type { JsonLdNode } from '@/seo/json-ld'
import { PROFILE_URLS } from '@/seo/profiles'

const ORIGIN = 'https://exemple.test'

const previousSiteUrl = process.env['SITE_URL']
beforeAll(() => {
  process.env['SITE_URL'] = ORIGIN
})
afterAll(() => {
  if (previousSiteUrl === undefined) delete process.env['SITE_URL']
  else process.env['SITE_URL'] = previousSiteUrl
})

/** Un dépôt réduit à ce que la composition consulte. */
const repositoryWithSkills = (names: readonly string[]) =>
  ({
    getFeaturedSkills: async () =>
      names.map((name, index) => ({ slug: `s${index}`, name, level: 5 })),
  }) as unknown as ContentRepository

function nodeOfType(graph: readonly JsonLdNode[], type: string): JsonLdNode {
  const found = graph.find((node) => node['@type'] === type)

  expect(found, `aucun nœud « ${type} » dans le graphe`).toBeDefined()
  return found as JsonLdNode
}

describe('accueil', () => {
  it('porte la personne **et** le site, dans un seul graphe', async () => {
    const document = await homeStructuredData(repositoryWithSkills(['TypeScript']), 'fr')

    expect(document['@graph']).toHaveLength(2)
    expect(nodeOfType(document['@graph'], 'Person')).toBeDefined()
    expect(nodeOfType(document['@graph'], 'WebSite')).toBeDefined()
  })

  it('lit l’intitulé de poste dans la langue de la page', async () => {
    const french = await homeStructuredData(repositoryWithSkills([]), 'fr')
    const english = await homeStructuredData(repositoryWithSkills([]), 'en')

    expect(nodeOfType(french['@graph'], 'Person')['jobTitle']).toBe('Développeur Full-Stack')
    expect(nodeOfType(english['@graph'], 'Person')['jobTitle']).toBe('Full-Stack Developer')
  })

  it('rattache la personne aux profils de la source unique', async () => {
    // Recopier les adresses ici ferait de ce test un second endroit où elles
    // sont écrites — c'est-à-dire exactement ce que `profiles.ts` empêche.
    const document = await homeStructuredData(repositoryWithSkills([]), 'fr')

    expect(nodeOfType(document['@graph'], 'Person')['sameAs']).toEqual(PROFILE_URLS)
  })

  it('déclare comme connues les compétences mises en avant, par leur nom', async () => {
    /*
     * ⭐ Le drapeau `featured` était jusqu'ici porté par le contenu et **lu par
     * personne** : `getFeaturedSkills` n'avait aucun appelant de production.
     * C'en est un.
     */
    const document = await homeStructuredData(
      repositoryWithSkills(['TypeScript', 'PostgreSQL']),
      'fr',
    )

    expect(nodeOfType(document['@graph'], 'Person')['knowsAbout']).toEqual([
      'TypeScript',
      'PostgreSQL',
    ])
  })

  it('n’émet aucun niveau de compétence, sous aucune forme', async () => {
    /*
     * ⛔ Décision **D2, ouverte** : les niveaux sont une auto-évaluation que
     * personne n'a relue. La page ne les affiche pas ; les données structurées ne
     * peuvent pas les publier par la porte de derrière. Le dépôt factice en
     * porte un exprès — sans quoi ce test ne pourrait pas échouer.
     */
    const document = await homeStructuredData(repositoryWithSkills(['TypeScript']), 'fr')

    expect(JSON.stringify(document)).not.toContain('level')
    expect(JSON.stringify(document)).not.toContain('"5"')
  })

  it('ne porte pas de fil d’Ariane : l’accueil est la racine', async () => {
    const document = await homeStructuredData(repositoryWithSkills([]), 'fr')

    expect(document['@graph'].some((node) => node['@type'] === 'BreadcrumbList')).toBe(false)
  })
})

describe('page de section', () => {
  it('porte un fil d’Ariane de deux niveaux, dans la langue de la page', () => {
    const trail = nodeOfType(sectionStructuredData('fr', 'projects')['@graph'], 'BreadcrumbList')

    expect(trail['itemListElement']).toEqual([
      expect.objectContaining({ position: 1, name: 'Aurélien Feignon', item: `${ORIGIN}/fr` }),
      expect.objectContaining({ position: 2, name: 'Projets', item: `${ORIGIN}/fr/projects` }),
    ])
  })

  it('nomme la section dans sa langue', () => {
    const trail = nodeOfType(sectionStructuredData('en', 'skills')['@graph'], 'BreadcrumbList')

    expect(trail['itemListElement']).toEqual([
      expect.objectContaining({ item: `${ORIGIN}/en` }),
      expect.objectContaining({ name: 'Skills', item: `${ORIGIN}/en/skills` }),
    ])
  })
})

describe('fiche d’expérience', () => {
  /*
   * ⚠️ Construit **dans** chaque test, jamais dans le corps du `describe` : ce
   * dernier est évalué à la collecte, donc **avant** `beforeAll`, et le document
   * naîtrait avec l'origine de l'environnement ambiant au lieu de celle qu'on
   * fixe ici. Écrit d'abord dans le corps, et vu échouer pour cette raison.
   */
  const documentOf = () =>
    experienceStructuredData('fr', { slug: 'askor', name: 'Lead développeur' })

  it('porte un fil d’Ariane de trois niveaux', () => {
    const trail = nodeOfType(documentOf()['@graph'], 'BreadcrumbList')

    expect(trail['itemListElement']).toEqual([
      expect.objectContaining({ position: 1, item: `${ORIGIN}/fr` }),
      expect.objectContaining({ position: 2, name: 'Expériences' }),
      expect.objectContaining({
        position: 3,
        name: 'Lead développeur',
        item: `${ORIGIN}/fr/experiences/askor`,
      }),
    ])
  })

  it('ne déclare **aucune** entité : une expérience n’est pas une œuvre', () => {
    /*
     * ⛔ Il n'existe pas de type schema.org honnête pour « un poste occupé ».
     * `CreativeWork` serait faux, et `Person.worksFor` affirmerait une
     * organisation — or l'une des deux expériences est le projet propre de
     * l'auteur, dont la société n'est pas constituée (`content/README.md`).
     * Le fil d'Ariane est ce qu'on peut dire de vrai.
     */
    expect(documentOf()['@graph']).toHaveLength(1)
  })
})

describe('fiche de projet', () => {
  const project = {
    slug: 'portfolio',
    title: 'Ce portfolio',
    summary: 'Un portfolio documentaire.',
    startedAt: '2026-08-11',
  }

  it('porte l’œuvre **et** son fil d’Ariane', () => {
    const graph = projectStructuredData('fr', project, ['TypeScript'])['@graph']

    expect(graph).toHaveLength(2)
    expect(nodeOfType(graph, 'CreativeWork')).toBeDefined()
    expect(nodeOfType(graph, 'BreadcrumbList')).toBeDefined()
  })

  it('nomme le projet dans le fil d’Ariane comme le titre de la page', () => {
    const trail = nodeOfType(projectStructuredData('fr', project, [])['@graph'], 'BreadcrumbList')

    expect(trail['itemListElement']).toEqual([
      expect.objectContaining({ position: 1 }),
      expect.objectContaining({ position: 2, name: 'Projets' }),
      expect.objectContaining({
        position: 3,
        name: 'Ce portfolio',
        item: `${ORIGIN}/fr/projects/portfolio`,
      }),
    ])
  })

  it('réémet la date de début **verbatim**, à sa précision (P4-17)', () => {
    const graph = projectStructuredData('fr', { ...project, startedAt: '2021' }, [])['@graph']

    expect(nodeOfType(graph, 'CreativeWork')['dateCreated']).toBe('2021')
  })

  it('reprend les libellés de technologies que la page affiche', () => {
    const graph = projectStructuredData('fr', project, ['TypeScript', 'Next.js'])['@graph']

    expect(nodeOfType(graph, 'CreativeWork')['keywords']).toEqual(['TypeScript', 'Next.js'])
  })

  it('n’annonce pas le dépôt du projet, que la page ne montre pas', () => {
    /*
     * ⛔ `content/` porte `links.repository`, et **aucune page ne le rend** —
     * dette relevée en P4-09. Une donnée structurée doit décrire ce que la page
     * affiche ; l'émettre ici publierait par les métadonnées un lien que le
     * visiteur ne peut pas suivre. Le jour où la fiche affiche ce lien, ce test
     * change en même temps que la vue.
     */
    expect(JSON.stringify(projectStructuredData('fr', project, []))).not.toContain('github.com')
  })
})
