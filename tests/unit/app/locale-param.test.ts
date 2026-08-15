/**
 * Lecture du segment de locale (P3-02).
 *
 * `dynamicParams = false` fait déjà répondre 404 avant tout rendu ; ce module est
 * le filet. Ce qui est vérifié ici est qu'il **est** un filet, et pas une garde
 * décorative qui laisserait passer une chaîne quelconque en `Locale`.
 */
import { describe, expect, it } from 'vitest'

import { readLocale } from '@/app/[locale]/locale-param'

describe('segment de locale', () => {
  it.each(['fr', 'en'])('rend « %s » tel quel', async (locale) => {
    await expect(readLocale(Promise.resolve({ locale }))).resolves.toBe(locale)
  })

  it.each(['de', 'FR', 'fr-FR', '', 'toString'])('refuse « %s »', async (locale) => {
    // `notFound()` lève : c'est le mécanisme de Next pour interrompre le rendu.
    await expect(readLocale(Promise.resolve({ locale }))).rejects.toThrow()
  })
})
