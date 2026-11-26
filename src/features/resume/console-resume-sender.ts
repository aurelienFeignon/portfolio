/**
 * `ResumeSender` du développement local sans identifiants Mailjet (P10-02).
 *
 * Il n'envoie rien : il écrit dans le journal ce qui **aurait** été envoyé, pour
 * que le formulaire se teste de bout en bout sur un poste sans secret.
 *
 * ⚠️ Il journalise l'adresse saisie. C'est acceptable parce qu'il ne sert qu'en
 * développement, où l'adresse est celle du développeur ; le choix de
 * l'implémentation selon l'environnement (P10-07) doit **refuser** celle-ci en
 * production plutôt que de s'y rabattre faute d'identifiants — et le
 * constructeur le refuse aussi, pour qu'un mauvais repli échoue bruyamment au
 * lieu d'écrire les adresses des visiteurs dans les journaux (CF-08).
 */
import type { Locale } from '@/i18n/locales'

import type { ResumeSender } from './resume-sender'

export class ConsoleResumeSender implements ResumeSender {
  readonly #log: (message: string) => void

  constructor(log: (message: string) => void = (message) => console.info(message)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ConsoleResumeSender est réservé au développement')
    }
    this.#log = log
  }

  async sendResume(email: string, locale: Locale): Promise<void> {
    this.#log(`[ConsoleResumeSender] CV (${locale}) non envoyé — destinataire : ${email}`)
  }
}
