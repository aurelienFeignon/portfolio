/**
 * L'assemblage de production (P10-06, P10-07) : la décision (`planResume`), sa description au
 * journal, et ce qui est construit d'après elle.
 *
 * Rien ici n'écrit sur le disque ni ne joint le réseau : les constructeurs ne font aucune E/S, et
 * la présence des PDF est injectée. Les valeurs Mailjet sont factices.
 */
import { describe, expect, it, vi } from 'vitest'

import { ConsoleResumeSender } from '@/features/resume/console-resume-sender'
import { FileRateLimiter } from '@/features/resume/file-rate-limiter'
import { MailjetResumeSender } from '@/features/resume/mailjet-resume-sender'
import { MemoryRateLimiter } from '@/features/resume/memory-rate-limiter'
import {
  createResumeDeps,
  DAILY_CAP_FILE_ENV,
  describeResumePlan,
  planResume,
  readMailjetConfig,
  resumeDeps,
} from '@/features/resume/runtime'

const MAILJET = {
  MAILJET_API_KEY: 'cle-factice',
  MAILJET_SECRET_KEY: 'secret-factice',
  RESUME_SENDER_EMAIL: 'cv@exemple.test',
  RESUME_SENDER_NAME: 'Expéditeur',
  RESUME_SEND_TIMEOUT_MS: '10000',
  RESUME_SIGNATURE_GITHUB_URL: 'https://github.com/exemple',
  RESUME_SIGNATURE_LINKEDIN_URL: 'https://www.linkedin.com/in/exemple',
}
const CAP = { [DAILY_CAP_FILE_ENV]: '/data/plafond.json' }
const PDFS = () => true

describe('readMailjetConfig', () => {
  it('lit les sept variables de l’envoi, délai converti en nombre', () => {
    expect(readMailjetConfig(MAILJET)).toEqual({
      config: {
        apiKey: 'cle-factice',
        secretKey: 'secret-factice',
        senderEmail: 'cv@exemple.test',
        senderName: 'Expéditeur',
        timeoutMs: 10_000,
        signatureLinks: ['https://github.com/exemple', 'https://www.linkedin.com/in/exemple'],
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
    ['RESUME_SIGNATURE_GITHUB_URL', 'github.com/exemple'],
    ['RESUME_SIGNATURE_LINKEDIN_URL', 'http://www.linkedin.com/in/exemple'],
  ])('refuse %s = « %s », en la nommant sans rendre sa valeur', (name, value) => {
    expect(readMailjetConfig({ ...MAILJET, [name]: value })).toEqual({ invalid: [name] })
  })
})

describe('planResume', () => {
  it('production complète : Mailjet et plafond sur fichier, rien en défaut', () => {
    expect(planResume({ NODE_ENV: 'production', ...MAILJET, ...CAP }, PDFS)).toMatchObject({
      sender: 'mailjet',
      missing: [],
      cap: 'fichier',
      capFile: '/data/plafond.json',
    })
  })

  it('production incomplète : aucun expéditeur ni plafond — jamais la console, jamais la mémoire', () => {
    const plan = planResume({ NODE_ENV: 'production', ...MAILJET, MAILJET_SECRET_KEY: '' }, PDFS)
    expect(plan).toMatchObject({ sender: 'aucun', missing: ['MAILJET_SECRET_KEY'], cap: 'aucun' })
  })

  it('un PDF absent désactive Mailjet et se nomme : chaque envoi échouerait', () => {
    const plan = planResume(
      { NODE_ENV: 'production', ...MAILJET, ...CAP },
      (locale) => locale === 'fr',
    )
    expect(plan).toMatchObject({ sender: 'aucun', missing: ['public/resume/cv-en.pdf'] })
  })

  it('hors production sans Mailjet : la console et la mémoire', () => {
    expect(planResume({ NODE_ENV: 'test' }, PDFS)).toMatchObject({
      sender: 'console',
      cap: 'mémoire',
      capFile: null,
    })
  })

  it('un fichier de plafond vide vaut absent', () => {
    expect(planResume({ NODE_ENV: 'production', [DAILY_CAP_FILE_ENV]: '' }, PDFS).cap).toBe('aucun')
  })

  it('vérifie par défaut les PDF réellement servis', () => {
    expect(planResume({ NODE_ENV: 'production', ...MAILJET, ...CAP }).missing).toEqual([])
  })
})

describe('describeResumePlan', () => {
  it('dit l’expéditeur, ce qui manque et le plafond — des noms, jamais des valeurs', () => {
    const plan = planResume({ NODE_ENV: 'production', MAILJET_API_KEY: 'cle-factice' }, PDFS)
    const line = describeResumePlan(plan)
    expect(line).toBe(
      '[resume] expéditeur : aucun (en défaut : MAILJET_SECRET_KEY, RESUME_SENDER_EMAIL, ' +
        'RESUME_SENDER_NAME, RESUME_SEND_TIMEOUT_MS, RESUME_SIGNATURE_GITHUB_URL, ' +
        'RESUME_SIGNATURE_LINKEDIN_URL) ; plafond global : aucun (RESUME_DAILY_CAP_FILE)',
    )
    expect(line).not.toContain('cle-factice')
  })

  it('reste sobre quand rien ne manque', () => {
    const plan = planResume({ NODE_ENV: 'production', ...MAILJET, ...CAP }, PDFS)
    expect(describeResumePlan(plan)).toBe(
      '[resume] expéditeur : mailjet ; plafond global : fichier',
    )
  })
})

describe('createResumeDeps', () => {
  it('construit Mailjet et le plafond persisté d’après le plan', () => {
    const deps = createResumeDeps(planResume({ NODE_ENV: 'production', ...MAILJET, ...CAP }, PDFS))
    expect(deps.sender).toBeInstanceOf(MailjetResumeSender)
    expect(deps.globalLimiter).toBeInstanceOf(FileRateLimiter)
    expect(deps.visitorLimiter).toBeInstanceOf(MemoryRateLimiter)
  })

  it('construit la console et la mémoire hors production', () => {
    const deps = createResumeDeps(planResume({ NODE_ENV: 'test' }, PDFS))
    expect(deps.sender).toBeInstanceOf(ConsoleResumeSender)
    expect(deps.globalLimiter).toBeInstanceOf(MemoryRateLimiter)
  })

  it('ne construit rien d’utilisable quand le plan dit « aucun »', () => {
    const deps = createResumeDeps(planResume({ NODE_ENV: 'production' }, PDFS))
    expect(deps.sender).toBeNull()
    expect(deps.globalLimiter).toBeNull()
  })

  it('hache en SHA-256 hexadécimal, sans jamais rendre la valeur', () => {
    const { hash } = createResumeDeps(planResume({ NODE_ENV: 'test' }, PDFS))
    expect(hash('visiteur@example.test')).toMatch(/^[0-9a-f]{64}$/)
    expect(hash('visiteur@example.test')).toBe(hash('visiteur@example.test'))
  })
})

describe('le journal des dépendances', () => {
  it('écrit sur la sortie d’erreur', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    createResumeDeps(planResume({ NODE_ENV: 'test' }, PDFS)).log('[resume] essai')
    expect(error).toHaveBeenCalledWith('[resume] essai')
    error.mockRestore()
  })
})

describe('resumeDeps', () => {
  it('rend la même instance d’une requête à l’autre : les limites vivent avec le processus', () => {
    expect(resumeDeps()).toBe(resumeDeps())
  })
})
