/**
 * En-tête du site : la marque et la navigation principale (P4-02).
 *
 * **La marque est le lien d'accueil**, et il n'y a pas de second lien
 * « Accueil » dans la navigation. Doubler la cible aurait ajouté une clé de
 * dictionnaire (`nav.home`, retirée en Phase 3 précisément parce que rien ne la
 * rendait) et un second chemin vers la même page, que les lecteurs d'écran
 * annoncent deux fois. Le texte visible **est** le nom accessible : aucun
 * `aria-label` ne vient le remplacer, ce qu'interdit WCAG 2.5.3 (« label in
 * name »).
 *
 * `current` dit où se trouve le visiteur. C'est une valeur et non un booléen
 * séparé : deux props pour une seule information finiraient par se contredire.
 *
 * Elle est **requise**. Tout endroit du site en a une — les cinq layouts la
 * déclarent —, et une prop optionnelle aurait décrit un état que rien ne peut
 * produire, testable seulement en le fabriquant. `SiteNav`, lui, la garde
 * facultative : là, l'absence est réelle.
 *
 * ⚠️ **Deux endroits ne sont pas une section, et pour des raisons opposées.**
 * L'accueil n'en est aucune parce qu'il les contient toutes : c'est la **marque**
 * qui y est marquée. La page introuvable (P4-07) n'en est aucune parce que le
 * visiteur **n'est nulle part** : rien n'y est marqué. Lui donner `'home'`
 * aurait annoncé « page courante » sur un lien qui mène ailleurs — la faute
 * exacte que la revue de P4-02 a relevée sur les pages de détail.
 *
 * Comme `SiteNav`, ce composant reçoit ses **liens tout faits** — `ui` ne peut
 * pas importer `routing` (`architecture.md` §1.2), et c'est ce qui le rend
 * testable sans rien savoir du routage.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

import styles from './site-header.module.css'
import { SiteNav, type SectionLink, type SectionName } from './site-nav'

/** Où se trouve le visiteur — une section, ou l'un des deux endroits qui n'en sont pas. */
export type CurrentPlace = SectionName | 'home' | 'notFound'

export function SiteHeader({
  locale,
  homeHref,
  links,
  current,
}: {
  readonly locale: Locale
  readonly homeHref: string
  readonly links: readonly SectionLink[]
  readonly current: CurrentPlace
}) {
  const messages = getMessages(locale)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a
          className={styles.brand}
          href={homeHref}
          {...(current === 'home' ? { 'aria-current': 'page' as const } : {})}
        >
          {messages.site.name}
        </a>
        {/* Propagation par étalement conditionnel plutôt que par `undefined` :
            `exactOptionalPropertyTypes` distingue « prop absente » de « prop à
            `undefined` », et seule la première est permise ici.
            La condition énumère les endroits qui ne sont pas une section : c'est
            aussi ce qui narrow `current` en `SectionName` pour `SiteNav`, si
            bien qu'un sixième endroit oublié ici ne compile pas. */}
        <SiteNav
          locale={locale}
          links={links}
          {...(current === 'home' || current === 'notFound' ? {} : { current })}
        />
      </div>
    </header>
  )
}
