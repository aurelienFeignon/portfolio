/**
 * Liste d'entités d'une section (P3-02).
 *
 * Volontairement pauvre : la Phase 3 prouve qu'une route résout la bonne entité
 * dans la bonne langue, elle ne met rien en forme — la stratégie de style est
 * l'ADR-0010, en Phase 4, et les listes réelles sont P4-04 à P4-06.
 *
 * L'**état vide** est traité ici et non ailleurs, parce qu'il n'est pas
 * exceptionnel : une locale peut ne pas traduire une section entière (R-07), et
 * la page doit rester valide plutôt que d'afficher une liste sans éléments.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

export interface EntityLink {
  readonly href: string
  readonly label: string
  /** Complément affiché après le lien : dates, catégorie, mention « en cours ». */
  readonly note?: string
}

export function EntityList({
  locale,
  items,
}: {
  readonly locale: Locale
  readonly items: readonly EntityLink[]
}) {
  const messages = getMessages(locale)

  if (items.length === 0) {
    return <p>{messages.empty}</p>
  }

  return (
    <ul>
      {items.map(({ href, label, note }) => (
        <li key={href}>
          <a href={href}>{label}</a>
          {note === undefined ? null : <span> — {note}</span>}
        </li>
      ))}
    </ul>
  )
}
