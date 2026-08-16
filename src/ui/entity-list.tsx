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
import { EmptyNotice } from './empty-notice'
import styles from './entity-list.module.css'

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
  if (items.length === 0) {
    return <EmptyNotice locale={locale} />
  }

  /* `role="list"` : voir `bare-list.module.css`, la raison y vit une fois. */
  return (
    <ul className={styles.list} role="list">
      {items.map(({ href, label, note }) => (
        <li key={href} className={styles.item}>
          <a className={styles.link} href={href}>
            {label}
          </a>
          {note === undefined ? null : <span className={styles.note}>{note}</span>}
        </li>
      ))}
    </ul>
  )
}
