/**
 * Vocabulaire des locales (écrit en P2-02, complété en P3-01).
 */
import { describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, LOCALES, isLocale } from '@/i18n/locales'

describe('locales', () => {
  it('déclare les deux locales de la v1', () => {
    expect(LOCALES).toEqual(['fr', 'en'])
  })

  it('prend le français par défaut, en tête de liste (H-04)', () => {
    expect(DEFAULT_LOCALE).toBe('fr')
    expect(LOCALES[0]).toBe(DEFAULT_LOCALE)
  })

  it.each(['fr', 'en'])('reconnaît « %s »', (value) => {
    expect(isLocale(value)).toBe(true)
  })

  it.each(['de', 'FR', 'fr-FR', '', 'toString'])('rejette « %s »', (value) => {
    expect(isLocale(value)).toBe(false)
  })
})
