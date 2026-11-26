/**
 * L'assemblage de production (P10-06) : ce que chaque environnement obtient.
 *
 * Rien ici n'écrit sur le disque : `FileRateLimiter` ne touche son fichier qu'à la première
 * consommation, et aucune n'a lieu.
 */
import { describe, expect, it, vi } from 'vitest'

import { ConsoleResumeSender } from '@/features/resume/console-resume-sender'
import { FileRateLimiter } from '@/features/resume/file-rate-limiter'
import { MemoryRateLimiter } from '@/features/resume/memory-rate-limiter'
import { createResumeDeps, DAILY_CAP_FILE_ENV, resumeDeps } from '@/features/resume/runtime'

describe('createResumeDeps', () => {
  it('hors production : expéditeur console et plafond en mémoire', () => {
    const deps = createResumeDeps({ NODE_ENV: 'test' })
    expect(deps.sender).toBeInstanceOf(ConsoleResumeSender)
    expect(deps.globalLimiter).toBeInstanceOf(MemoryRateLimiter)
    expect(deps.visitorLimiter).toBeInstanceOf(MemoryRateLimiter)
  })

  it('en production : aucun expéditeur tant que Mailjet n’existe pas (P10-07)', () => {
    expect(createResumeDeps({ NODE_ENV: 'production' }).sender).toBeNull()
  })

  it('en production sans fichier de plafond : aucun plafond, donc indisponible', () => {
    expect(createResumeDeps({ NODE_ENV: 'production' }).globalLimiter).toBeNull()
    expect(
      createResumeDeps({ NODE_ENV: 'production', [DAILY_CAP_FILE_ENV]: '' }).globalLimiter,
    ).toBeNull()
  })

  it('avec un fichier de plafond : le plafond est persisté, dans tout environnement', () => {
    for (const NODE_ENV of ['production', 'test'] as const) {
      const deps = createResumeDeps({ NODE_ENV, [DAILY_CAP_FILE_ENV]: '/data/plafond.json' })
      expect(deps.globalLimiter).toBeInstanceOf(FileRateLimiter)
    }
  })

  it('hache en SHA-256 hexadécimal, sans jamais rendre la valeur', () => {
    const { hash } = createResumeDeps({ NODE_ENV: 'test' })
    expect(hash('visiteur@example.test')).toMatch(/^[0-9a-f]{64}$/)
    expect(hash('visiteur@example.test')).toBe(hash('visiteur@example.test'))
  })

  it('journalise sur la sortie d’erreur', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    createResumeDeps({ NODE_ENV: 'test' }).log('[resume] essai')
    expect(error).toHaveBeenCalledWith('[resume] essai')
    error.mockRestore()
  })
})

describe('resumeDeps', () => {
  it('rend la même instance d’une requête à l’autre : les limites vivent avec le processus', () => {
    expect(resumeDeps()).toBe(resumeDeps())
  })
})
