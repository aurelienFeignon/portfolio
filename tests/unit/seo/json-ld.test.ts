/**
 * Données structurées JSON-LD (P4-09) — `architecture.md` §9.
 *
 * Ce que ces tests protègent est une **émission de données**, pas un rendu : ce
 * qui sort d'ici est lu par une machine, jamais par un visiteur. Un champ faux
 * n'a donc aucun symptôme visible — c'est exactement la classe de panne que
 * P4-17 a coûté une tâche entière à fermer sur les dates.
 */
import { describe, expect, it } from 'vitest'

import type { PageLocation } from '@/routing/paths'
import {
  breadcrumbNode,
  creativeWorkNode,
  jsonLdDocument,
  personId,
  personNode,
  webSiteNode,
  SCHEMA_CONTEXT,
} from '@/seo/json-ld'

const SITE = new URL('https://exemple.test')

const HOME: PageLocation = { kind: 'home' }
const SECTION: PageLocation = { kind: 'section', section: 'projects' }
const ENTITY: PageLocation = { kind: 'entity', section: 'projects', slug: 'portfolio' }

const PERSON = {
  name: 'Aurélien Feignon',
  jobTitle: 'Développeur Full-Stack',
  sameAs: ['https://github.com/exemple'],
  knowsAbout: ['TypeScript', 'PostgreSQL'],
}

describe('document JSON-LD', () => {
  it('déclare le vocabulaire une seule fois, pour tout le graphe', () => {
    // Un `@context` par nœud serait la même chaîne répétée : les nœuds d'une
    // page se lisent ensemble, et c'est ce qui permet à l'un de désigner
    // l'autre par son `@id`.
    const document = jsonLdDocument([{ '@type': 'Thing' }, { '@type': 'Autre' }])

    expect(document['@context']).toBe(SCHEMA_CONTEXT)
    expect(document['@graph']).toHaveLength(2)
  })
})

describe('Person', () => {
  it('porte un identifiant indépendant de la langue', () => {
    /*
     * ⭐ Le point n'est pas cosmétique : `/fr#person` et `/en#person` seraient
     * **deux personnes** pour un moteur de recherche, chacune moitié moins
     * documentée. C'est une personne, décrite en deux langues.
     */
    expect(personId(SITE)).toBe('https://exemple.test/#person')
  })

  it('annonce le nom et l’intitulé de poste reçus', () => {
    const person = personNode(SITE, PERSON)

    expect(person['@type']).toBe('Person')
    expect(person['name']).toBe('Aurélien Feignon')
    expect(person['jobTitle']).toBe('Développeur Full-Stack')
  })

  it('ne décrit pas la personne avec la description du site', () => {
    /*
     * ⛔ La première version émettait `site.description` — « Portfolio de
     * développeur Full-Stack : expériences, projets et compétences » — comme
     * `Person.description`. C'est la description du **site**, et elle était de
     * surcroît répétée mot pour mot sur le `WebSite` du même graphe. Même faute
     * que l'`alt` d'image de P4-08 : décrire A avec le texte de B. Aucune prose
     * sur la personne n'existe dans ce dépôt — c'est la décision D7, ouverte.
     */
    expect(personNode(SITE, PERSON)).not.toHaveProperty('description')
  })

  it('désigne une page réellement servie, et non l’origine nue', () => {
    /*
     * ⚠️ `/` n'est **pas une page** : c'est une redirection 307 qui négocie
     * `Accept-Language` (P3-03), absente de tout sitemap. `Person.url` promet
     * « une page qui parle de cette personne ». Le commentaire du code promettait
     * déjà l'accueil de la locale par défaut ; le code émettait l'origine.
     */
    expect(personNode(SITE, PERSON)['url']).toBe('https://exemple.test/fr')
  })

  it('rattache la personne à ses profils publics', () => {
    expect(personNode(SITE, PERSON)['sameAs']).toEqual(['https://github.com/exemple'])
  })

  it('déclare ce qu’elle connaît, jamais à quel niveau', () => {
    // Les niveaux (1 à 5) sont une auto-évaluation que personne n'a relue
    // (décision D2) : la page ne les affiche pas, le JSON-LD ne peut pas les
    // affirmer non plus. `knowsAbout` ne porte que des noms.
    expect(personNode(SITE, PERSON)['knowsAbout']).toEqual(['TypeScript', 'PostgreSQL'])
  })

  it('omet un champ vide plutôt que d’annoncer une liste vide', () => {
    /*
     * ⛔ `sameAs: []` **affirme** « cette personne n'a aucun profil public », là
     * où l'absence du champ ne dit rien. Les deux ne se ressemblent que dans du
     * JSON ; pour un consommateur, l'un est une donnée et l'autre un silence.
     */
    const person = personNode(SITE, { ...PERSON, sameAs: [], knowsAbout: [] })

    expect(person).not.toHaveProperty('sameAs')
    expect(person).not.toHaveProperty('knowsAbout')
  })
})

describe('WebSite', () => {
  it('désigne l’origine du site, et non la page qui le déclare', () => {
    // Le site n'est pas sa page d'accueil française : les deux accueils sont
    // deux traductions du même site.
    const site = webSiteNode(SITE, { locale: 'fr', name: 'Nom', description: 'Description' })

    expect(site['@type']).toBe('WebSite')
    expect(site['url']).toBe('https://exemple.test/')
    expect(site['name']).toBe('Nom')
    expect(site['description']).toBe('Description')
  })

  it('déclare la langue de la page qui le porte', () => {
    expect(webSiteNode(SITE, { locale: 'en', name: 'N', description: 'D' })['inLanguage']).toBe(
      'en',
    )
  })

  it('désigne son auteur par l’identifiant de la personne, sans la redécrire', () => {
    // Redécrire la personne ici en ferait une seconde source de vérité, et la
    // divergence serait muette. Le nom accompagne l'identifiant pour qu'une page
    // lue seule sache **qui** — voir le test de `CreativeWork` ci-dessous.
    expect(webSiteNode(SITE, { locale: 'fr', name: 'N', description: 'D' })['author']).toEqual({
      '@id': personId(SITE),
      name: 'N',
    })
  })
})

describe('CreativeWork', () => {
  const PROJECT = {
    locale: 'fr' as const,
    location: ENTITY,
    name: 'Ce portfolio',
    description: 'Un portfolio documentaire.',
    startedAt: '2026-08-11',
    keywords: ['TypeScript', 'Next.js'],
    authorName: 'Aurélien Feignon',
  }

  it('désigne la page canonique du projet dans sa langue', () => {
    const work = creativeWorkNode(SITE, PROJECT)

    expect(work['@type']).toBe('CreativeWork')
    expect(work['url']).toBe('https://exemple.test/fr/projects/portfolio')
  })

  it('réémet la date **verbatim**, à la précision qu’elle porte', () => {
    /*
     * ⭐⭐⭐ C'est la propriété que P4-17 a rendue vraie par construction, et le
     * seul endroit où elle pouvait encore être perdue. Compléter `2021` en
     * `2021-01-01` affirmerait un jour que personne ne connaît — à un moteur de
     * recherche, silencieusement, puisqu'une date complète est toujours valide.
     */
    expect(creativeWorkNode(SITE, { ...PROJECT, startedAt: '2021' })['dateCreated']).toBe('2021')
    expect(creativeWorkNode(SITE, { ...PROJECT, startedAt: '2021-06' })['dateCreated']).toBe(
      '2021-06',
    )
    expect(creativeWorkNode(SITE, PROJECT)['dateCreated']).toBe('2026-08-11')
  })

  it('reprend les technologies telles que la page les affiche', () => {
    // Les libellés résolus, jamais les slugs : ce que la page montre et ce
    // qu'elle déclare doivent être la même chose.
    expect(creativeWorkNode(SITE, PROJECT)['keywords']).toEqual(['TypeScript', 'Next.js'])
  })

  it('nomme son auteur, et pas seulement son identifiant', () => {
    /*
     * ⛔⛔ **Un `@id` seul aurait produit une œuvre sans auteur nommé.** Le nœud
     * `Person` complet n'est émis que par l'accueil ; une fiche de projet lue
     * seule — ce que fait tout consommateur de données structurées — n'aurait
     * trouvé qu'une référence vers un nœud absent de son graphe, c'est-à-dire un
     * **nœud anonyme**. Relevé en revue.
     */
    expect(creativeWorkNode(SITE, PROJECT)['author']).toEqual({
      '@id': personId(SITE),
      name: 'Aurélien Feignon',
    })
  })

  it('déclare la langue de l’entité rendue', () => {
    expect(creativeWorkNode(SITE, { ...PROJECT, locale: 'en' })['inLanguage']).toBe('en')
  })
})

describe('BreadcrumbList', () => {
  it('numérote les niveaux à partir de 1, dans l’ordre du chemin', () => {
    const trail = breadcrumbNode(SITE, 'fr', [
      { name: 'Aurélien Feignon', location: HOME },
      { name: 'Projets', location: SECTION },
      { name: 'Ce portfolio', location: ENTITY },
    ])

    expect(trail['@type']).toBe('BreadcrumbList')
    expect(trail['itemListElement']).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Aurélien Feignon',
        item: 'https://exemple.test/fr',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Projets',
        item: 'https://exemple.test/fr/projects',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Ce portfolio',
        item: 'https://exemple.test/fr/projects/portfolio',
      },
    ])
  })

  it('construit chaque niveau dans la langue de la page', () => {
    // Un fil d'Ariane anglais qui pointerait vers `/fr/projects` ferait changer
    // de langue en remontant d'un cran.
    const trail = breadcrumbNode(SITE, 'en', [
      { name: 'Aurélien Feignon', location: HOME },
      { name: 'Projects', location: SECTION },
    ])

    expect(trail['itemListElement']).toEqual([
      expect.objectContaining({ item: 'https://exemple.test/en' }),
      expect.objectContaining({ item: 'https://exemple.test/en/projects' }),
    ])
  })
})
