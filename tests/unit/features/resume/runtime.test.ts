/**
 * L'assemblage de production (P10-06, P10-07) : ce que chaque environnement obtient.
 *
 * Rien ici n'écrit sur le disque ni ne joint le réseau : `FileRateLimiter` ne touche son fichier
 * qu'à la première consommation, `MailjetResumeSender` n'appelle `fetch` qu'à l'envoi, et aucun
 * n'a lieu. Les valeurs Mailjet sont factices.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import { ConsoleResumeSender } from '@/features/resume/console-resume-sender'
import { FileRateLimiter } from '@/features/resume/file-rate-limiter'
import { MailjetResumeSender } from '@/features/resume/mailjet-resume-sender'
import { MemoryRateLimiter } from '@/features/resume/memory-rate-limiter'
import {
  createResumeDeps,
  DAILY_CAP_FILE_ENV,
  readMailjetConfig,
  resumeDeps,
} from '@/features/resume/runtime'

const MAILJET = {
  MAILJET_API_KEY: 'cle-factice',
  MAILJET_SECRET_KEY: 'secret-factice',
  RESUME_SENDER_EMAIL: 'cv@exemple.test',
  RESUME_SENDER_NAME: 'Expéditeur',
  RESUME_SEND_TIMEOUT_MS: '10000',
}

let error: MockInstance<typeof console.error>
beforeEach(() => {
  error = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  error.mockRestore()
})

describe('readMailjetConfig', () => {
  it('lit les cinq variables de l’envoi, délai converti en nombre', () => {
    expect(readMailjetConfig(MAILJET)).toEqual({
      config: {
        apiKey: 'cle-factice',
        secretKey: 'secret-factice',
        senderEmail: 'cv@exemple.test',
        senderName: 'Expéditeur',
        timeoutMs: 10_000,
      },
    })
  })

  it('nomme toutes les variables absentes', () => {
    expect(readMailjetConfig({})).toEqual({ invalid: Object.keys(MAILJET) })
  })

  it.each([
    ['MAILJET_API_KEY', '   '],
    ['RESUME_SENDER_EMAIL', 'pas-une-adresse'],
    ['RESUME_SEND_TIMEOUT_MS', '10s'],
    ['RESUME_SEND_TIMEOUT_MS', '999'],
    ['RESUME_SEND_TIMEOUT_MS', '60001'],
  ])('refuse %s = « %s », en la nommant sans rendre sa valeur', (name, value) => {
    const result = readMailjetConfig({ ...MAILJET, [name]: value })
    expect(result).toEqual({ invalid: [name] })
  })
})

describe('createResumeDeps', () => {
  it('hors production, sans Mailjet : expéditeur console et plafond en mémoire', () => {
    const deps = createResumeDeps({ NODE_ENV: 'test' })
    expect(deps.sender).toBeInstanceOf(ConsoleResumeSender)
    expect(deps.globalLimiter).toBeInstanceOf(MemoryRateLimiter)
    expect(deps.visitorLimiter).toBeInstanceOf(MemoryRateLimiter)
  })

  it('dit en une ligne l’expéditeur et le plafond retenus, hors production', () => {
    createResumeDeps({ NODE_ENV: 'test', MAILJET_API_KEY: 'cle-factice' })
    expect(error).toHaveBeenCalledWith(
      '[resume] expéditeur : console (variables en défaut : MAILJET_SECRET_KEY, ' +
        'RESUME_SENDER_EMAIL, RESUME_SENDER_NAME, RESUME_SEND_TIMEOUT_MS) ; plafond global : mémoire',
    )
    expect(JSON.stringify(error.mock.calls)).not.toContain('cle-factice')
  })

  it('avec une configuration Mailjet complète : Mailjet, dans tout environnement', () => {
    for (const NODE_ENV of ['production', 'test'] as const) {
      expect(createResumeDeps({ NODE_ENV, ...MAILJET }).sender).toBeInstanceOf(MailjetResumeSender)
    }
    expect(error).toHaveBeenCalledWith(
      '[resume] expéditeur : mailjet ; plafond global : aucun (RESUME_DAILY_CAP_FILE)',
    )
  })

  it('en production sans Mailjet : aucun expéditeur, jamais la console, et les noms au journal', () => {
    const deps = createResumeDeps({ NODE_ENV: 'production', ...MAILJET, MAILJET_SECRET_KEY: '' })
    expect(deps.sender).toBeNull()
    expect(error).toHaveBeenCalledWith(
      '[resume] expéditeur : aucun (variables en défaut : MAILJET_SECRET_KEY) ; ' +
        'plafond global : aucun (RESUME_DAILY_CAP_FILE)',
    )
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret-factice')
  })

  it('en production sans fichier de plafond : aucun plafond, donc indisponible', () => {
    expect(createResumeDeps({ NODE_ENV: 'production', ...MAILJET }).globalLimiter).toBeNull()
    expect(
      createResumeDeps({ NODE_ENV: 'production', ...MAILJET, [DAILY_CAP_FILE_ENV]: '' })
        .globalLimiter,
    ).toBeNull()
  })

  it('avec un fichier de plafond : le plafond est persisté, dans tout environnement', () => {
    for (const NODE_ENV of ['production', 'test'] as const) {
      const deps = createResumeDeps({ NODE_ENV, [DAILY_CAP_FILE_ENV]: '/data/plafond.json' })
      expect(deps.globalLimiter).toBeInstanceOf(FileRateLimiter)
    }
    expect(error).toHaveBeenLastCalledWith(expect.stringContaining('plafond global : fichier'))
  })

  it('hache en SHA-256 hexadécimal, sans jamais rendre la valeur', () => {
    const { hash } = createResumeDeps({ NODE_ENV: 'test' })
    expect(hash('visiteur@example.test')).toMatch(/^[0-9a-f]{64}$/)
    expect(hash('visiteur@example.test')).toBe(hash('visiteur@example.test'))
  })

  it('journalise sur la sortie d’erreur', () => {
    createResumeDeps({ NODE_ENV: 'test' }).log('[resume] essai')
    expect(error).toHaveBeenCalledWith('[resume] essai')
  })
})

describe('resumeDeps', () => {
  it('rend la même instance d’une requête à l’autre : les limites vivent avec le processus', () => {
    expect(resumeDeps()).toBe(resumeDeps())
  })
})
