/**
 * Redirection de `/` (P3-03) et **404 localisée** (P4-07).
 *
 * La négociation elle-même est couverte par `tests/unit/i18n/negotiate.test.ts` ;
 * ce qui se vérifie ici est ce que le proxy en **fait** : la cible, le code de
 * statut, et l'en-tête `Vary` sans lequel un cache partagé servirait la
 * redirection du premier visiteur à tous les suivants.
 */
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import proxy from '@/proxy'
import { config } from '@/proxy'

function requestWith(acceptLanguage?: string, path = '/'): NextRequest {
  return new NextRequest(`https://exemple.test${path}`, {
    headers: acceptLanguage === undefined ? {} : { 'accept-language': acceptLanguage },
  })
}

describe('redirection de la racine', () => {
  it.each([
    ['fr', 'https://exemple.test/fr'],
    ['en', 'https://exemple.test/en'],
    ['en-GB,en;q=0.9', 'https://exemple.test/en'],
    ['de,es;q=0.8', 'https://exemple.test/fr'],
  ])('« %s » mène à %s', (header, expected) => {
    expect(proxy(requestWith(header)).headers.get('location')).toBe(expected)
  })

  it('mène à la locale par défaut sans en-tête', () => {
    expect(proxy(requestWith()).headers.get('location')).toBe('https://exemple.test/fr')
  })

  it('redirige temporairement, jamais définitivement', () => {
    // Un 301 serait mémorisé par le navigateur du premier visiteur, quelle que
    // soit la langue des suivants.
    expect(proxy(requestWith('fr')).status).toBe(307)
  })

  it('déclare varier selon la langue demandée', () => {
    expect(proxy(requestWith('en')).headers.get('vary')).toContain('Accept-Language')
  })

  it('ne borne le matcher qu’au coût, jamais à la correction', () => {
    // Ancré, comme Next l'applique : sans `^…$`, l'expression trouverait une
    // correspondance n'importe où dans le chemin et le test passerait toujours.
    const [pattern] = config.matcher
    const matcher = new RegExp(`^${pattern as string}$`)

    // Seul `_next/` est exclu — les fragments et les images optimisées, qu'il
    // serait absurde de faire traverser une fonction.
    expect(matcher.test('/_next/static/chunk.js')).toBe(false)

    // ⛔ Tout le reste traverse, **y compris ce qui porte une extension**. Deux
    // versions de ce motif ont écarté les fichiers par leur forme : la première
    // par une liste écrite à la main, qui a fait répondre 404 aux deux CV ; la
    // seconde par « un chemin contenant un point est un fichier », qui laissait
    // `/wp-login.php` recevoir la 404 interne de Next — sans `lang`. Seul le
    // disque sait quels fichiers existent : la décision est dans la fonction.
    for (const path of ['/fr/projects/inconnu', '/sitemap.xml', '/robots.txt', '/wp-login.php']) {
      expect(matcher.test(path)).toBe(true)
    }
  })
})

describe('page introuvable', () => {
  it.each(['/fr/projects', '/robots.txt', '/resume/cv-fr.pdf'])(
    'laisse passer %s, que le serveur sert réellement',
    (path) => {
      // Les trois listes gravées au build : une page, une route-poignée, un
      // fichier de `public/`. Le proxy ne peut interroger ni le Content Layer ni
      // le disque — absents de l'image de production pour le premier, hors de
      // portée d'une fonction de proxy pour le second.
      const response = proxy(requestWith('fr', path))

      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
      expect(response.status).toBe(200)
    },
  )

  it.each([
    ['un slug inconnu', '/fr/projects/inconnu'],
    ['une section inconnue', '/fr/rien'],
    ['une locale inconnue', '/de/projects'],
    ['un chemin sans locale', '/rien'],
    // ⛔ Mesuré sur l'image de production : ces trois adresses recevaient la 404
    // interne de Next, hors du layout racine, donc sans `lang` — le défaut WCAG
    // 3.1.1 que cette tâche supprime, par la porte de derrière.
    ['une adresse pointée qui n’existe pas', '/wp-login.php'],
    ['un fichier qui n’existe pas', '/cv.pdf'],
    ['une page avec une extension inventée', '/fr/projects/portfolio.html'],
  ])('réécrit %s vers la 404 française', (_label, path) => {
    const response = proxy(requestWith('fr', path))

    // ⚠️ Le **statut** compte autant que la cible : une réécriture rend 200 par
    // défaut, et servir le bon contenu avec le mauvais statut dirait à un moteur
    // de recherche que la page existe.
    expect(response.status).toBe(404)
    expect(response.headers.get('x-middleware-rewrite')).toContain('/fr/404')
  })

  it('déduit la langue de l’URL avant de négocier', () => {
    // `/en/rien` est demandé par un navigateur francophone : c'est l'URL qui
    // décide, pas l'en-tête — le visiteur a explicitement demandé l'anglais.
    const response = proxy(requestWith('fr', '/en/rien'))

    expect(response.headers.get('x-middleware-rewrite')).toContain('/en/404')
  })

  it.each(['/robots.txt', '/resume/cv-fr.pdf'])(
    'laisse passer %s, qui répond sans être une page',
    (path) => {
      // Absents du manifeste, ils seraient réécrits en 404 : le site perdrait
      // son index et ses deux CV, en répondant proprement.
      const response = proxy(requestWith('fr', path))

      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
      expect(response.status).toBe(200)
    },
  )

  it.each(['/wp-login.php', '/cv.pdf', '/fr/projects/portfolio.html'])(
    'réécrit %s, qui porte un point sans exister',
    (path) => {
      // ⛔ Mesuré sur l'image de production : ces trois adresses recevaient la
      // 404 interne de Next, hors du layout racine, donc sans `lang` — le
      // défaut WCAG 3.1.1 que cette tâche supprime, par la porte de derrière.
      const response = proxy(requestWith('fr', path))

      expect(response.status).toBe(404)
      expect(response.headers.get('x-middleware-rewrite')).toContain('/fr/404')
    },
  )

  it('annonce que la réponse dépend de la langue **quand elle en dépend**', () => {
    // Sans `Vary`, un cache partagé servirait la 404 française à un anglophone.
    expect(proxy(requestWith('en', '/rien')).headers.get('Vary')).toBe('Accept-Language')
  })

  it('ne l’annonce pas quand la locale vient de l’URL', () => {
    // L'en-tête n'a pas été lu : le déclarer demanderait au cache une entrée par
    // valeur d'`Accept-Language` — très forte cardinalité — pour des réponses
    // identiques, et les 404 sont le trafic le plus volumineux d'un site public.
    expect(proxy(requestWith('en', '/fr/rien')).headers.get('Vary')).toBeNull()
  })
})
