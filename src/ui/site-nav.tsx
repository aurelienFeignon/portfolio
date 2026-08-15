/**
 * Navigation principale : les trois sections du portfolio (P3-02).
 *
 * Le composant reçoit ses **liens tout faits**. `src/ui` ne peut pas importer
 * `src/routing` (`architecture.md` §1.2), et c'est utile ici : la construction
 * d'URL reste au seul endroit qui la connaît, et ce composant devient testable
 * sans rien savoir du routage.
 *
 * Il va en revanche chercher ses **libellés** lui-même (`ui → i18n` est
 * autorisé) : les faire descendre en props ferait traverser cinq chaînes à
 * chaque appelant pour rien.
 *
 * Aucun `next/link` : la navigation est une balise `<a>`. C'est ce qui fait
 * tenir le budget de `performance-budget.md` §4 et ce qui rend le profil `no-js`
 * vrai par construction plutôt que par vérification.
 *
 * La Phase 3 laissait ce choix ouvert « à rouvrir en P4-02, avec une mesure ».
 * **Mesuré en P4-02, et maintenu** : le layout documentaire complet coûte
 * **0,0 Ko de JavaScript** sur les 16 routes, socle inchangé à 129,5 Ko
 * (`phase-4-log.md` §7.3). La question se rouvre le jour où une tâche aura
 * besoin d'une navigation client — pas avant, et pas sans nouvelle mesure.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages, type Messages } from '../i18n/messages/index.ts'

import styles from './site-nav.module.css'

/**
 * Le nom d'une section, **tel que le dictionnaire le connaît**.
 *
 * Pas d'import du type `Section` de `src/routing` : `ui → routing` est interdit.
 * Ce type-ci porte exactement les mêmes valeurs, et l'accord entre les deux est
 * vérifié là où il compte — au point d'appel, dans `src/app`, qui passe de
 * vraies `Section` et ne compilerait pas si les deux divergeaient.
 */
export type SectionName = keyof Messages['sections']

export interface SectionLink {
  readonly section: SectionName
  readonly href: string
}

/**
 * `current` est **facultatif**, et son absence est un cas réel, pas un oubli :
 * l'accueil n'est aucune des trois sections. Marquer un lien par défaut y
 * désignerait une page où le visiteur n'est pas.
 *
 * D'où vient l'information : le layout racine ne connaît pas la section
 * affichée, et l'App Router ne la lui donne pas — la lire depuis l'URL
 * demanderait `headers()`, qui rendrait la route dynamique et casserait le gate
 * de rendu statique. Ce sont donc les layouts de section qui la déclarent, un
 * par section, chacun n'ayant qu'une valeur possible (P4-02).
 */
export function SiteNav({
  locale,
  links,
  current,
}: {
  readonly locale: Locale
  readonly links: readonly SectionLink[]
  readonly current?: SectionName
}) {
  const messages = getMessages(locale)

  return (
    <nav aria-label={messages.nav.label}>
      <ul className={styles.list}>
        {links.map(({ section, href }) => (
          <li key={section}>
            {/*
              `aria-current="true"` — « l'élément courant du groupe » — et non
              `"page"`, qui affirme que **ce lien est la page affichée**. La
              même navigation sert la liste d'une section et les pages de détail
              qu'elle contient : sur `/fr/projects/portfolio`, `"page"` annoncerait
              « page courante » sur un lien qui mène ailleurs. Le layout qui rend
              cette navigation ne peut pas distinguer les deux cas — il couvre le
              segment entier —, et une valeur juste dans tous les cas vaut mieux
              qu'une valeur plus précise à moitié fausse.
            */}
            <a
              className={styles.link}
              href={href}
              {...(section === current ? { 'aria-current': 'true' as const } : {})}
            >
              {messages.sections[section].name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
