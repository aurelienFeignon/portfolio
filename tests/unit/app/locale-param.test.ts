/**
 * Lecture du segment de locale (P3-02).
 *
 * `dynamicParams = false` fait déjà répondre 404 avant tout rendu ; ce module est
 * le filet. Ce qui est vérifié ici est qu'il **est** un filet, et pas une garde
 * décorative qui laisserait passer une chaîne quelconque en `Locale`.
 */
import { describe, expect, it } from 'vitest'

import { readEntityParams, readLocale, staticSlugParams } from '@/app/[locale]/locale-param'

describe('segment de locale', () => {
  it.each(['fr', 'en'])('rend « %s » tel quel', async (locale) => {
    await expect(readLocale(Promise.resolve({ locale }))).resolves.toBe(locale)
  })

  it.each(['de', 'FR', 'fr-FR', '', 'toString'])('refuse « %s »', async (locale) => {
    // `notFound()` lève : c'est le mécanisme de Next pour interrompre le rendu.
    await expect(readLocale(Promise.resolve({ locale }))).rejects.toThrow()
  })
})

describe('paramètres d’une page de détail', () => {
  it('rend la locale et le slug en une seule attente', async () => {
    await expect(
      readEntityParams(Promise.resolve({ locale: 'en', slug: 'augure' })),
    ).resolves.toEqual({ locale: 'en', slug: 'augure' })
  })

  it('refuse une locale inconnue, slug valide ou non', async () => {
    await expect(
      readEntityParams(Promise.resolve({ locale: 'de', slug: 'augure' })),
    ).rejects.toThrow()
  })
})

describe('slugs à prégénérer', () => {
  const list = async (locale: 'fr' | 'en') =>
    locale === 'fr' ? [{ slug: 'augure' }, { slug: 'portfolio' }] : [{ slug: 'augure' }]

  it('énumère les slugs de la locale demandée', async () => {
    await expect(staticSlugParams({ locale: 'fr' }, list)).resolves.toEqual([
      { slug: 'augure' },
      { slug: 'portfolio' },
    ])
  })

  it('n’énumère que ce qui existe dans cette locale', async () => {
    await expect(staticSlugParams({ locale: 'en' }, list)).resolves.toEqual([{ slug: 'augure' }])
  })

  it('n’énumère rien pour une locale inconnue, et ne lève pas', async () => {
    // Une locale hors liste ne peut pas arriver ici — le segment parent ne
    // l'énumère pas —, mais la garde est ce qui rend le `string` de Next
    // utilisable, et elle ne doit pas casser la génération des autres.
    await expect(staticSlugParams({ locale: 'de' }, list)).resolves.toEqual([])
  })
})
