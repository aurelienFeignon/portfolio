/**
 * Pied de page du site (P4-02).
 *
 * Volontairement pauvre, et pour une raison : ce qu'un pied de page contient
 * d'ordinaire n'existe pas encore ici. Le sélecteur de langue dépend de la page
 * affichée — il ne peut pas vivre dans un layout qui ne la connaît pas — et la
 * page de contact est en Phase 10. Y poser des liens morts ou une mention
 * traduite que personne ne lit coûterait une clé de dictionnaire pour rien
 * (`fr.ts` : aucune clé n'est écrite en prévision d'un usage).
 *
 * Il reste donc la mention de droits, qui est la seule information réelle — et
 * le point de repère `contentinfo`, que l'audit de P4-10 vérifiera.
 *
 * `year` est une prop plutôt qu'un `new Date()` interne : le composant reste
 * pur, donc testable sans figer l'horloge, et la valeur est de toute façon
 * gravée au build puisque toutes les routes sont prérendues.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

import styles from './site-footer.module.css'

export function SiteFooter({ locale, year }: { readonly locale: Locale; readonly year: number }) {
  const messages = getMessages(locale)

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <small className={styles.note}>
          © {year} {messages.site.name}
        </small>
      </div>
    </footer>
  )
}
