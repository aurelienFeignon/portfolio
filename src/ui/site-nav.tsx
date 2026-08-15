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
 * Aucun `next/link` : la navigation est une balise `<a>` et le restera tant que
 * le site n'a pas de JavaScript client. C'est ce qui fait tenir le budget de
 * `performance-budget.md` §4 et ce qui rend le profil `no-js` vrai par
 * construction plutôt que par vérification. À rouvrir en P4-02, avec une mesure.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages, type Messages } from '../i18n/messages/index.ts'

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
 * Pas de `currentSection` ici, et c'est délibéré : ce composant est rendu par le
 * layout, qui ne connaît pas la section affichée. Marquer le lien actif
 * (`aria-current="page"`) demande cette information, donc une restructuration du
 * layout — c'est P4-02. Ajouter dès maintenant une prop que personne ne peut
 * fournir donnerait une API non exercée, et l'illusion que le point est traité.
 */
export function SiteNav({
  locale,
  links,
}: {
  readonly locale: Locale
  readonly links: readonly SectionLink[]
}) {
  const messages = getMessages(locale)

  return (
    <nav aria-label={messages.nav.label}>
      <ul>
        {links.map(({ section, href }) => (
          <li key={section}>
            <a href={href}>{messages.sections[section].name}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
