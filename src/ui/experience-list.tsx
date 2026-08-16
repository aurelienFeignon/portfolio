/**
 * Liste des expériences (P4-04).
 *
 * **Pourquoi ce composant et non `EntityList`.** Celui-ci rend un lien et une
 * note : c'est ce dont la Phase 3 avait besoin pour prouver qu'une route
 * résout. Une expérience porte quatre informations qu'un recruteur lit
 * ensemble — le poste, l'employeur, le lieu et la période — et dont l'une,
 * « en cours », doit se voir **sans ouvrir la fiche**. Les faire entrer dans une
 * `note` en aurait fait une chaîne concaténée, impossible à mettre en forme et
 * muette pour une machine.
 *
 * La forme reçue est **aplatie** : `src/ui` ne peut pas importer `src/content`
 * (`architecture.md` §1.2), donc la route compose. C'est aussi ce qui rend ce
 * composant testable sans lire un fichier.
 *
 * L'**état vide** est traité ici, comme dans `EntityList` et pour la même
 * raison : une locale peut ne traduire aucune expérience (R-07), et la page doit
 * rester valide plutôt que d'afficher une liste sans éléments.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

import { CompanyLine } from './company-line'
import { DateRange } from './date-range'
import styles from './experience-list.module.css'

export interface ExperienceSummary {
  readonly href: string
  readonly role: string
  readonly company: string
  /** Facultatif au schéma : absent, il ne laisse **aucun séparateur** derrière lui. */
  readonly location?: string | undefined
  readonly startedAt: string
  /** Absent ⇒ poste en cours : c'est la dérivation de P2-06, lue à la source. */
  readonly endedAt?: string | undefined
}

export function ExperienceList({
  locale,
  items,
}: {
  readonly locale: Locale
  readonly items: readonly ExperienceSummary[]
}) {
  const messages = getMessages(locale)

  if (items.length === 0) {
    return <p>{messages.empty}</p>
  }

  return (
    <ul className={styles.list}>
      {items.map(({ href, role, company, location, startedAt, endedAt }) => (
        <li key={href} className={styles.item}>
          <h2 className={styles.role}>
            <a className={styles.link} href={href}>
              {role}
            </a>
          </h2>
          <CompanyLine company={company} location={location} className={styles.where} />
          <DateRange locale={locale} startedAt={startedAt} endedAt={endedAt} />
        </li>
      ))}
    </ul>
  )
}
