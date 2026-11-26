/**
 * `ResumeSender` de production : l'API Send v3.1 de Mailjet, en `fetch` natif (P10-07, ADR-0006).
 *
 * Aucune dépendance ajoutée : la requête tient en un objet JSON et une authentification Basic.
 *
 * ## Ce que le visiteur contrôle, et ce qu'il ne contrôle pas
 *
 * Seul le **destinataire** vient de la saisie (déjà validée par `requestResume`). Le sujet et le
 * corps viennent du dictionnaire de la locale (`resumeEmail`), la pièce jointe du PDF de cette
 * même locale : rien de ce qu'écrit le visiteur n'entre dans le message (anti-relais, R-06).
 *
 * ## Les pannes
 *
 * Toute réponse autre qu'un `success` explicite **rejette** — statut HTTP, corps illisible, statut
 * de message `error`, délai dépassé. ⛔ Les erreurs ne portent ni l'adresse ni le corps de la
 * réponse : `requestResume` n'en journalise que le nom, et le corps de Mailjet répète le
 * destinataire.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Locale } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'

import type { ResumeSender } from './resume-sender'

export const MAILJET_SEND_URL = 'https://api.mailjet.com/v3.1/send'

export interface MailjetConfig {
  readonly apiKey: string
  readonly secretKey: string
  readonly senderEmail: string
  readonly senderName: string
  /** Au-delà, l'appel est abandonné et traité comme une panne de transport. */
  readonly timeoutMs: number
}

export interface MailjetDeps {
  /** Injecté par les tests : aucun chemin de la suite ne joint le réseau. */
  readonly fetch?: typeof fetch
  /** Le PDF de la locale. Par défaut, celui que l'image sert sous `public/resume/`. */
  readonly readAttachment?: (locale: Locale) => Promise<Uint8Array>
}

/** Une panne de transport : le nom suffit au journal, le message ne dit que le statut. */
export class MailjetError extends Error {
  override readonly name = 'MailjetError'
}

/** Le CV versionné de la locale, tel que l'image le sert (`public/resume/cv-<locale>.pdf`). */
export function resumePdfPath(locale: Locale): string {
  return join(process.cwd(), 'public', 'resume', `cv-${locale}.pdf`)
}

export class MailjetResumeSender implements ResumeSender {
  readonly #config: MailjetConfig
  readonly #fetch: typeof fetch
  readonly #readAttachment: (locale: Locale) => Promise<Uint8Array>

  constructor(config: MailjetConfig, deps: MailjetDeps = {}) {
    this.#config = config
    this.#fetch = deps.fetch ?? fetch
    this.#readAttachment = deps.readAttachment ?? ((locale) => readFile(resumePdfPath(locale)))
  }

  async sendResume(email: string, locale: Locale): Promise<void> {
    const { resumeEmail } = getMessages(locale)
    const attachment = await this.#readAttachment(locale)
    const { apiKey, secretKey, senderEmail, senderName, timeoutMs } = this.#config

    const response = await this.#fetch(MAILJET_SEND_URL, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: senderEmail, Name: senderName },
            To: [{ Email: email }],
            Subject: resumeEmail.subject,
            TextPart: resumeEmail.text,
            Attachments: [
              {
                ContentType: 'application/pdf',
                Filename: resumeEmail.attachmentName,
                Base64Content: Buffer.from(attachment).toString('base64'),
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      // Un corps jamais lu retient la connexion jusqu'au ramasse-miettes : on le jette.
      await response.body?.cancel()
      throw new MailjetError(`HTTP ${response.status}`)
    }
    const status = await response.json().then(
      (body: unknown) =>
        (body as { Messages?: { Status?: unknown }[] } | null)?.Messages?.[0]?.Status,
      () => undefined,
    )
    if (status !== 'success') throw new MailjetError('statut de message non réussi')
  }
}
