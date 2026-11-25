/**
 * `ResumeSender` du développement local sans identifiants Mailjet (P10-02).
 *
 * Il n'envoie rien : il écrit dans le journal ce qui **aurait** été envoyé, pour
 * que le formulaire se teste de bout en bout sur un poste sans secret.
 *
 * ⚠️ Il journalise l'adresse saisie. C'est acceptable parce qu'il ne sert qu'en
 * développement, où l'adresse est celle du développeur ; le choix de
 * l'implémentation selon l'environnement (P10-07) doit donc **refuser** celle-ci
 * en production plutôt que de s'y rabattre faute d'identifiants.
 */
import type { Locale } from '@/i18n/locales'

import type { ResumeSender } from './resume-sender'

export class ConsoleResumeSender implements ResumeSender {
  readonly #log: (message: string) => void

  constructor(log: (message: string) => void = (message) => console.info(message)) {
    this.#log = log
  }

  async sendResume(email: string, locale: Locale): Promise<void> {
    this.#log(`[ConsoleResumeSender] CV (${locale}) non envoyé — destinataire : ${email}`)
  }
}
