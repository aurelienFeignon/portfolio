/**
 * Redirection de `/` (P3-03).
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

function requestWith(acceptLanguage?: string): NextRequest {
  return new NextRequest('https://exemple.test/', {
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

  it('ne s’applique qu’à la racine', () => {
    // Un matcher plus large ferait passer chaque page statique par une fonction,
    // à chaque requête, pour ne rien décider.
    expect(config.matcher).toBe('/')
  })
})
