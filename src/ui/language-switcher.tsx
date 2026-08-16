/**
 * Sélecteur de langue (P3-09).
 *
 * **Il propose toujours les deux langues**, même quand l'entité courante n'existe
 * pas dans l'autre. La règle de repli du risque R-07 — « la version manquante
 * n'est ni listée, ni référencée en `hreflang`, ni au sitemap » — vise ce qu'on
 * **annonce à un moteur de recherche**, pas ce qu'on offre à un visiteur.
 * Supprimer le lien priverait celui-ci du seul moyen de changer de langue depuis
 * cette page ; le laisser pointer vers la page absente l'enverrait en 404.
 *
 * Le lien mène donc à la page existante la plus proche — la section — et **le
 * dit** : `translated: false` affiche la mention correspondante, associée au lien
 * par `aria-describedby` pour qu'un lecteur d'écran l'annonce avant l'activation
 * plutôt qu'après.
 *
 * Chaque libellé porte `lang` : sans lui, une synthèse vocale française
 * prononcerait « English » à la française. Et `hrefLang` décrit la cible, ce qui
 * n'est pas la même information — d'où les deux attributs.
 */
import { LOCALE_NAMES, type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

import styles from './language-switcher.module.css'

export interface LanguageOption {
  readonly locale: Locale
  /** Toujours atteignable : la page elle-même, ou son repli. */
  readonly href: string
  /** `false` quand cette page n'existe pas dans cette langue. */
  readonly translated: boolean
}

export function LanguageSwitcher({
  current,
  options,
}: {
  readonly current: Locale
  readonly options: readonly LanguageOption[]
}) {
  const messages = getMessages(current)

  return (
    <nav aria-label={messages.language.label}>
      {/* `role="list"` : voir `bare-list.module.css`, la raison y vit une fois.
          ⛔ Il manquait au premier jet de P4-11 — ce `<ul>` composait `bareList`
          sans lui, donc sans sémantique de liste sous VoiceOver, sur les 16
          pages servies et sur le moteur même que le profil mobile venait
          couvrir. Relevé en revue, et gardé depuis. */}
      <ul className={styles.list} role="list">
        {options.map(({ locale, href, translated }) => {
          if (locale === current) {
            return (
              <li key={locale}>
                <span className={styles.current} lang={locale} aria-current="true">
                  {LOCALE_NAMES[locale]}
                </span>
              </li>
            )
          }

          const noteId = `language-unavailable-${locale}`

          return (
            <li key={locale}>
              <a
                className={styles.link}
                href={href}
                lang={locale}
                hrefLang={locale}
                {...(translated ? {} : { 'aria-describedby': noteId })}
              >
                {LOCALE_NAMES[locale]}
              </a>
              {translated ? null : (
                <span className={styles.note} id={noteId}>
                  {messages.language.unavailable}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
