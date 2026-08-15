/**
 * Sections et segments d'URL (P3-05).
 */
import { describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/locales'
import { SECTIONS, isSection, routeSegments, segmentFor } from '@/routing/sections'

describe('sections', () => {
  it('déclare les trois sections du portfolio (CF-01)', () => {
    expect(SECTIONS).toEqual(['experiences', 'projects', 'skills'])
  })

  it.each(SECTIONS)('reconnaît « %s »', (value) => {
    expect(isSection(value)).toBe(true)
  })

  it.each(['project', 'Projects', 'about', '', 'toString'])('rejette « %s »', (value) => {
    expect(isSection(value)).toBe(false)
  })
})

describe('segments de route', () => {
  it('donne un segment à chaque section, dans chaque locale', () => {
    for (const locale of LOCALES) {
      for (const section of SECTIONS) {
        expect(segmentFor(locale, section)).toBeTruthy()
      }
    }
  })

  it("est l'identité en v1 : les segments ne sont pas traduits (ADR-0005)", () => {
    for (const locale of LOCALES) {
      for (const section of SECTIONS) {
        expect(segmentFor(locale, section)).toBe(section)
      }
    }
  })

  it('ne fait pas dépendre deux locales du même objet de segments', () => {
    // Sans cela, traduire un segment en anglais le traduirait aussi en français
    // — la table donnerait l'illusion d'être par locale sans l'être.
    expect(routeSegments.fr).not.toBe(routeSegments.en)
  })
})
