/**
 * « Employeur · Lieu » — la ligne qui situe un poste (P4-04).
 *
 * **Une règle, un endroit, un test.** `location` est facultatif au schéma, et
 * l'absence ne doit laisser **aucun séparateur orphelin** — « Augure · ». C'est
 * une branche, donc exactement ce que `DateRange` invoque pour exister : une
 * décision de présentation qui se teste, et qui n'a rien à faire dans un fichier
 * de route, vérifiable seulement en E2E.
 *
 * Elle y était pourtant, écrite deux fois : une fois dans la liste, une fois
 * dans la fiche — et seule la première était couverte. Relevé en revue.
 */
import styles from './company-line.module.css'

export function CompanyLine({
  company,
  location,
  className,
}: {
  readonly company: string
  readonly location?: string | undefined
  /** Permet à l'appelant de porter sa propre taille sans redéclarer la règle. */
  readonly className?: string | undefined
}) {
  return (
    <p className={className === undefined ? styles.line : `${styles.line} ${className}`}>
      {company}
      {location === undefined ? null : ` · ${location}`}
    </p>
  )
}
