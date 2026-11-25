/**
 * Faux et implémentation de développement de `ResumeSender` (P10-02).
 */
import { describe, expect, it, vi } from 'vitest'

import { ConsoleResumeSender } from '@/features/resume/console-resume-sender'
import { FakeResumeSender } from '@/features/resume/fake-resume-sender'

describe('FakeResumeSender', () => {
  it('enregistre les envois, dans l’ordre', async () => {
    const sender = new FakeResumeSender()
    await sender.sendResume('a@example.test', 'fr')
    await sender.sendResume('b@example.test', 'en')
    expect(sender.sent).toEqual([
      { email: 'a@example.test', locale: 'fr' },
      { email: 'b@example.test', locale: 'en' },
    ])
  })

  it('simule une panne de transport sans rien enregistrer, puis se rétablit', async () => {
    const sender = new FakeResumeSender()
    const panne = new Error('délai dépassé')
    sender.failWith(panne)
    await expect(sender.sendResume('a@example.test', 'fr')).rejects.toBe(panne)
    expect(sender.sent).toEqual([])

    sender.recover()
    await sender.sendResume('a@example.test', 'fr')
    expect(sender.sent).toHaveLength(1)
  })

  it('rejette avec une erreur par défaut quand aucune n’est fournie', async () => {
    const sender = new FakeResumeSender()
    sender.failWith()
    await expect(sender.sendResume('a@example.test', 'fr')).rejects.toThrow(/simulée/)
  })
})

describe('ConsoleResumeSender', () => {
  it('journalise ce qui aurait été envoyé, sans rien envoyer', async () => {
    const log = vi.fn()
    await new ConsoleResumeSender(log).sendResume('a@example.test', 'en')
    expect(log).toHaveBeenCalledOnce()
    expect(log.mock.calls[0]?.[0]).toMatch(/\(en\).*non envoyé.*a@example\.test/)
  })

  it('écrit par défaut dans console.info', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      await new ConsoleResumeSender().sendResume('a@example.test', 'fr')
      expect(info).toHaveBeenCalledOnce()
    } finally {
      info.mockRestore()
    }
  })
})
