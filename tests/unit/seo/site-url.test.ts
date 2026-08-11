import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAbsoluteUrl, getSiteUrl, parseSiteUrl, SITE_URL_ENV } from '@/seo/site-url'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('parseSiteUrl', () => {
  it('accepte une origine https et la normalise', () => {
    expect(parseSiteUrl('https://aurelienfeignon.com').toString()).toBe(
      'https://aurelienfeignon.com/',
    )
  })

  it('ignore les espaces autour de la valeur', () => {
    expect(parseSiteUrl('  https://aurelienfeignon.com  ').origin).toBe(
      'https://aurelienfeignon.com',
    )
  })

  it('accepte http, pour un environnement local sans TLS', () => {
    expect(parseSiteUrl('http://localhost:3000').origin).toBe('http://localhost:3000')
  })

  // Le message doit être *spécifique* : asserter seulement la présence de
  // « SITE_URL » laisserait passer n'importe quelle autre erreur du module,
  // puisque toutes le mentionnent. Constaté par mutation en P1-10.
  it.each([undefined, '', '   '])('refuse une valeur vide (%o) en le disant', (raw) => {
    expect(() => parseSiteUrl(raw)).toThrow(new RegExp(`${SITE_URL_ENV} est absente`))
  })

  it('refuse une valeur qui n’est pas une URL absolue', () => {
    expect(() => parseSiteUrl('aurelienfeignon.com')).toThrow(/URL absolue/)
  })

  it('refuse un protocole non http(s)', () => {
    expect(() => parseSiteUrl('ftp://aurelienfeignon.com')).toThrow(/http ou https/)
  })

  it.each([
    'https://aurelienfeignon.com/fr',
    'https://aurelienfeignon.com/?a=1',
    'https://aurelienfeignon.com/#x',
  ])('refuse une origine porteuse de chemin, requête ou fragment (%s)', (raw) => {
    expect(() => parseSiteUrl(raw)).toThrow(/origine seule/)
  })
})

describe('buildAbsoluteUrl', () => {
  const site = parseSiteUrl('https://aurelienfeignon.com')

  it('préfixe un chemin absolu', () => {
    expect(buildAbsoluteUrl(site, '/fr/projects')).toBe('https://aurelienfeignon.com/fr/projects')
  })

  it('tolère un chemin sans slash initial', () => {
    expect(buildAbsoluteUrl(site, 'fr/projects')).toBe('https://aurelienfeignon.com/fr/projects')
  })

  it('ne produit jamais de double slash', () => {
    expect(buildAbsoluteUrl(site, '/')).toBe('https://aurelienfeignon.com/')
  })

  it('conserve les caractères déjà échappés du slug', () => {
    expect(buildAbsoluteUrl(site, '/fr/projects/mon-projet')).toBe(
      'https://aurelienfeignon.com/fr/projects/mon-projet',
    )
  })
})

describe('getSiteUrl', () => {
  it('lit l’origine depuis l’environnement', () => {
    vi.stubEnv(SITE_URL_ENV, 'https://aurelienfeignon.com')
    expect(getSiteUrl().origin).toBe('https://aurelienfeignon.com')
  })

  it('échoue au démarrage plutôt que de produire des URL fausses', () => {
    vi.stubEnv(SITE_URL_ENV, '')
    expect(() => getSiteUrl()).toThrow(SITE_URL_ENV)
  })
})
