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

  it('ne traverse pas les ressources que Next sert lui-même', () => {
    // Le matcher couvre désormais tout le site — il y a quelque chose à décider
    // sur chaque URL —, mais pas ce qui n'a pas de page : les faire traverser
    // une fonction coûterait à chaque requête pour rien.
    // Ancré, comme Next l'applique : sans `^…$`, l'expression trouverait une
    // correspondance n'importe où dans le chemin et le test passerait toujours.
    const [pattern] = config.matcher
    const matcher = new RegExp(`^${pattern as string}$`)

    expect(matcher.test('/fr/projects/inconnu')).toBe(true)
    expect(matcher.test('/_next/static/chunk.js')).toBe(false)
    expect(matcher.test('/sitemap.xml')).toBe(false)
    expect(matcher.test('/robots.txt')).toBe(false)
  })
})

describe('page introuvable', () => {
  it('laisse passer un chemin réellement servi', () => {
    // La liste est gravée au build : le proxy ne peut pas demander au Content
    // Layer quels slugs existent, `content/` n'étant pas dans l'image.
    const response = proxy(requestWith('fr', '/fr/projects'))

    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.status).toBe(200)
  })

  it.each([
    ['un slug inconnu', '/fr/projects/inconnu', '/fr/404'],
    ['une section inconnue', '/fr/rien', '/fr/404'],
    ['une locale inconnue', '/de/projects', '/fr/404'],
    ['un chemin sans locale', '/rien', '/fr/404'],
  ])('réécrit %s vers la 404 de la bonne langue', (_label, path, target) => {
    const response = proxy(requestWith('fr', path))

    // ⚠️ Le **statut** compte autant que la cible : une réécriture rend 200 par
    // défaut, et servir le bon contenu avec le mauvais statut dirait à un moteur
    // de recherche que la page existe.
    expect(response.status).toBe(404)
    expect(response.headers.get('x-middleware-rewrite')).toContain(target)
  })

  it('déduit la langue de l’URL avant de négocier', () => {
    // `/en/rien` est demandé par un navigateur francophone : c'est l'URL qui
    // décide, pas l'en-tête — le visiteur a explicitement demandé l'anglais.
    const response = proxy(requestWith('fr', '/en/rien'))

    expect(response.headers.get('x-middleware-rewrite')).toContain('/en/404')
  })

  it('annonce que la réponse dépend de la langue demandée', () => {
    // Sans `Vary`, un cache partagé servirait la 404 française à un anglophone.
    expect(proxy(requestWith('en', '/rien')).headers.get('Vary')).toBe('Accept-Language')
  })
})
