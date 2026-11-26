/**
 * L'adaptateur Mailjet sur le contenu réel de sa requête (P10-07, P10-16).
 *
 * `fetch` est **injecté** : aucun chemin de cette suite ne joint le réseau. Ce qui est vérifié est
 * ce que Mailjet recevrait — destinataire, expéditeur, sujet et corps fixes, pièce jointe —, et ce
 * que l'adaptateur fait de chaque réponse.
 */
import { readFile } from 'node:fs/promises'

import { describe, expect, it, vi } from 'vitest'

import {
  MAILJET_SEND_URL,
  MailjetError,
  MailjetResumeSender,
  type MailjetConfig,
} from '@/features/resume/mailjet-resume-sender'
import { ResumeRefusedError } from '@/features/resume/resume-sender'
import { getMessages } from '@/i18n/messages'

const CONFIG: MailjetConfig = {
  apiKey: 'cle',
  secretKey: 'secret',
  senderEmail: 'cv@exemple.test',
  senderName: 'Expéditeur',
  timeoutMs: 5_000,
  signatureLinks: ['https://github.com/exemple', 'https://www.linkedin.com/in/exemple'],
}

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46])

function respond(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
}

const SUCCESS = { Messages: [{ Status: 'success' }] }

function setup(response: Response | Promise<Response> = respond(200, SUCCESS)) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response)
  const readAttachment = vi.fn(async () => PDF)
  const sender = new MailjetResumeSender(CONFIG, { fetch, readAttachment })
  return { fetch, readAttachment, sender }
}

/** Le corps JSON et les options du seul appel fait. */
function sentRequest(fetch: ReturnType<typeof setup>['fetch']) {
  expect(fetch).toHaveBeenCalledTimes(1)
  const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
  return { url, init, body: JSON.parse(init.body as string) as Record<string, unknown> }
}

describe('MailjetResumeSender — la requête', () => {
  it.each(['fr', 'en'] as const)(
    'envoie à Mailjet le message fixe de la locale « %s », au seul destinataire saisi',
    async (locale) => {
      const { fetch, readAttachment, sender } = setup()
      await sender.sendResume('visiteur@example.test', locale)

      const { url, init, body } = sentRequest(fetch)
      const { resumeEmail } = getMessages(locale)
      expect(url).toBe(MAILJET_SEND_URL)
      expect(init.method).toBe('POST')
      expect(readAttachment).toHaveBeenCalledWith(locale)
      expect(body).toEqual({
        Messages: [
          {
            From: { Email: 'cv@exemple.test', Name: 'Expéditeur' },
            To: [{ Email: 'visiteur@example.test' }],
            Subject: resumeEmail.subject,
            TextPart: `${resumeEmail.text}\nhttps://github.com/exemple\nhttps://www.linkedin.com/in/exemple`,
            Attachments: [
              {
                ContentType: 'application/pdf',
                Filename: resumeEmail.attachmentName,
                Base64Content: 'JVBERg==',
              },
            ],
          },
        ],
      })
    },
  )

  it('s’authentifie en Basic avec la clé et le secret, et déclare du JSON', async () => {
    const { fetch, sender } = setup()
    await sender.sendResume('visiteur@example.test', 'fr')

    const headers = sentRequest(fetch).init.headers as Record<string, string>
    expect(headers.authorization).toBe(`Basic ${Buffer.from('cle:secret').toString('base64')}`)
    expect(headers['content-type']).toBe('application/json')
  })

  it('borne l’appel par un délai d’expiration', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const { fetch, sender } = setup()
    await sender.sendResume('visiteur@example.test', 'fr')

    expect(timeout).toHaveBeenCalledWith(5_000)
    expect(sentRequest(fetch).init.signal).toBeInstanceOf(AbortSignal)
    timeout.mockRestore()
  })
})

describe('MailjetResumeSender — les réponses', () => {
  it('se résout sur un message accepté', async () => {
    await expect(setup().sender.sendResume('a@example.test', 'fr')).resolves.toBeUndefined()
  })

  it.each([
    ['un refus HTTP', respond(401, { ErrorMessage: 'API key authentication failed' })],
    ['un statut de message en erreur', respond(200, { Messages: [{ Status: 'error' }] })],
    ['un corps illisible', respond(200, 'pas du JSON')],
    ['un corps nul', respond(200, 'null')],
    ['un corps sans message', respond(200, {})],
  ])('rejette en MailjetError sur %s, sans l’adresse dans l’erreur', async (_, response) => {
    const error = await setup(response)
      .sender.sendResume('visiteur@example.test', 'fr')
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(MailjetError)
    // Un refus CERTAIN : c'est ce qui autorise l'appelant à rendre les créneaux.
    expect(error).toBeInstanceOf(ResumeRefusedError)
    expect((error as Error).name).toBe('MailjetError')
    expect((error as Error).message).not.toContain('visiteur@example.test')
  })

  it('refuse avec certitude, sans appeler Mailjet, si la pièce jointe est illisible', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const sender = new MailjetResumeSender(CONFIG, {
      fetch,
      readAttachment: () => Promise.reject(new Error('ENOENT')),
    })
    const error = await sender.sendResume('a@example.test', 'fr').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ResumeRefusedError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('propage un délai dépassé tel quel : panne ambiguë, pas un refus', async () => {
    const abort = new DOMException('délai', 'TimeoutError')
    const { sender } = setup(Promise.reject(abort))
    await expect(sender.sendResume('a@example.test', 'fr')).rejects.toBe(abort)
  })
})

describe('le PDF joint par défaut', () => {
  it.each(['fr', 'en'] as const)(
    'est le CV versionné de la locale « %s », lu sur le disque',
    async (locale) => {
      const fetch = vi.fn<typeof globalThis.fetch>(async () => respond(200, SUCCESS))
      await new MailjetResumeSender(CONFIG, { fetch }).sendResume('a@example.test', locale)
      const body = sentRequest(fetch).body as {
        Messages: { Attachments: { Base64Content: string }[] }[]
      }
      const sent = Buffer.from(body.Messages[0]!.Attachments[0]!.Base64Content, 'base64')
      const served = await readFile(`public/resume/cv-${locale}.pdf`)
      expect(served.subarray(0, 4).toString()).toBe('%PDF')
      expect(sent.equals(served)).toBe(true)
    },
  )
})
