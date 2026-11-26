/**
 * Faux `ResumeSender` en mémoire, pour les tests (P10-02).
 *
 * Il enregistre chaque envoi accepté et sait simuler une panne de transport :
 * c'est ce qui permet de tester tout le parcours — y compris la réponse neutre
 * sur panne — sans qu'aucun chemin de code ne joigne le réseau.
 */
import type { Locale } from '@/i18n/locales'

import type { ResumeSender } from './resume-sender'

export interface SentResume {
  readonly email: string
  readonly locale: Locale
}

export class FakeResumeSender implements ResumeSender {
  readonly #sent: SentResume[] = []
  #failure: Error | null = null

  /** Copie des envois acceptés, dans l'ordre. Une panne simulée n'y laisse rien. */
  get sent(): readonly SentResume[] {
    return [...this.#sent]
  }

  /** Les envois suivants rejettent avec `error`, jusqu'à `recover()`. */
  failWith(error: Error = new Error('panne de transport simulée')): void {
    this.#failure = error
  }

  recover(): void {
    this.#failure = null
  }

  async sendResume(email: string, locale: Locale): Promise<void> {
    if (this.#failure) throw this.#failure
    this.#sent.push({ email, locale })
  }
}
