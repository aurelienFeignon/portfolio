/**
 * Envoi du CV — le contrat métier (P10-01, ADR-0006).
 *
 * Une interface à **un seul verbe** : c'est ce qui permet de tester tout le
 * parcours sans envoyer un seul e-mail (un faux en mémoire, P10-02) et de
 * changer de fournisseur sans toucher au métier (`architecture.md` §6).
 *
 * **Ce que l'interface ne transporte pas, et c'est voulu** : ni sujet, ni corps,
 * ni pièce jointe. Ils sont fixes et appartiennent à l'implémentation, jamais à
 * l'appelant — rien de ce que saisit le visiteur n'entre dans le message, sauf
 * l'adresse du destinataire (anti-relais, R-06).
 */
import type { Locale } from '@/i18n/locales'

export interface ResumeSender {
  /**
   * Envoie le CV dans la langue demandée à `email`, adresse **déjà validée** par
   * l'appelant.
   *
   * Se résout quand le fournisseur a accepté le message. **Rejette** sur toute
   * panne de transport — réseau, délai dépassé, refus du fournisseur — et c'est
   * l'appelant qui en fait une réponse neutre : l'erreur ne remonte jamais telle
   * quelle au visiteur.
   */
  sendResume(email: string, locale: Locale): Promise<void>
}
