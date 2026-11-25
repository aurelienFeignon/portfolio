/**
 * Validation de la demande de CV : schéma, honeypot, time-trap (P10-03).
 */
import { describe, expect, it } from 'vitest'

import {
  HONEYPOT_FIELD,
  MIN_FILL_MS,
  RENDERED_AT_FIELD,
  parseResumeRequest,
} from '@/features/resume/schema'

const NOW = 1_800_000_000_000

function form(overrides: Record<string, unknown> = {}) {
  return {
    email: 'visiteur@example.test',
    locale: 'fr',
    [HONEYPOT_FIELD]: '',
    [RENDERED_AT_FIELD]: String(NOW - 10_000),
    ...overrides,
  }
}

describe('parseResumeRequest', () => {
  it('accepte une demande humaine et normalise l’adresse', () => {
    expect(parseResumeRequest(form({ email: '  visiteur@example.test ' }), NOW)).toEqual({
      kind: 'valid',
      request: { email: 'visiteur@example.test', locale: 'fr' },
    })
  })

  it('met l’adresse en minuscules : la casse ne crée pas une seconde clé de rate limit', () => {
    const verdict = parseResumeRequest(form({ email: 'Visiteur@Example.TEST' }), NOW)
    expect(verdict).toEqual({
      kind: 'valid',
      request: { email: 'visiteur@example.test', locale: 'fr' },
    })
  })

  it('n’appelle pas son honeypot d’un nom que le remplissage automatique reconnaît', () => {
    expect(HONEYPOT_FIELD).not.toMatch(/website|url|company|name|email|tel|address/i)
  })

  it('accepte un honeypot absent', () => {
    const sansPiege: Record<string, unknown> = form()
    delete sansPiege[HONEYPOT_FIELD]
    expect(parseResumeRequest(sansPiege, NOW).kind).toBe('valid')
  })

  describe('saisie invalide', () => {
    it.each([
      ['adresse malformée', { email: 'pas-une-adresse' }],
      ['adresse vide', { email: '' }],
      ['adresse trop longue', { email: `${'a'.repeat(250)}@example.test` }],
      ['locale inconnue', { locale: 'de' }],
      ['adresse absente', { email: undefined }],
    ])('%s', (_cas, overrides) => {
      expect(parseResumeRequest(form(overrides), NOW)).toEqual({ kind: 'invalid' })
    })
  })

  describe('robots', () => {
    it('honeypot rempli', () => {
      expect(parseResumeRequest(form({ [HONEYPOT_FIELD]: 'https://spam.test' }), NOW)).toEqual({
        kind: 'bot',
      })
    })

    it('formulaire soumis trop vite', () => {
      const renderedAt = String(NOW - MIN_FILL_MS + 1)
      expect(parseResumeRequest(form({ [RENDERED_AT_FIELD]: renderedAt }), NOW).kind).toBe('bot')
    })

    it('admis à exactement MIN_FILL_MS', () => {
      const renderedAt = String(NOW - MIN_FILL_MS)
      expect(parseResumeRequest(form({ [RENDERED_AT_FIELD]: renderedAt }), NOW).kind).toBe('valid')
    })

    it.each([
      ['horodatage absent', undefined],
      ['horodatage vide', ''],
      ['horodatage non numérique', 'hier'],
      ['horodatage négatif', '-5'],
      ['horodatage dans le futur', String(NOW + 60_000)],
    ])('%s', (_cas, renderedAt) => {
      expect(parseResumeRequest(form({ [RENDERED_AT_FIELD]: renderedAt }), NOW).kind).toBe('bot')
    })

    it('juge les pièges avant la saisie : un robot n’apprend pas quelle adresse passerait', () => {
      expect(parseResumeRequest(form({ email: 'invalide', [HONEYPOT_FIELD]: 'x' }), NOW).kind).toBe(
        'bot',
      )
    })

    it('entrée qui n’est pas un objet', () => {
      expect(parseResumeRequest(null, NOW).kind).toBe('bot')
    })
  })
})
