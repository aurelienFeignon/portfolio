/**
 * La pile technique d'une entité (P4-05).
 *
 * Deuxième exemplaire — la fiche d'une expérience et celle d'un projet — donc
 * le seuil du dépôt. Ce qui était réellement recopié n'est pas la boucle : c'est
 * le trio `role="list"` + `aria-labelledby` + étiquette, dont deux tiers sont
 * des règles d'accessibilité qui ne se voient pas quand elles manquent.
 *
 * Elle reste un `<ul>` : c'est bien une liste, et un lecteur d'écran en annonce
 * le nombre d'éléments — à condition que `role="list"` soit là, voir
 * `bare-list.module.css`.
 *
 * Les libellés arrivent **déjà résolus** : `technologies` porte des slugs, et
 * c'est le dépôt qui les traduit (`getTechnologyLabels`), en levant sur un slug
 * inconnu plutôt qu'en s'y repliant.
 */
import chip from './chip.module.css'
import chipRow from './chip-row.module.css'

export function TechnologyList({
  labels,
  labelledBy,
}: {
  readonly labels: readonly string[]
  /** `id` du titre qui nomme la liste — c'est lui qui la rend désignable. */
  readonly labelledBy: string
}) {
  return (
    <ul className={chipRow.chipRow} role="list" aria-labelledby={labelledBy}>
      {labels.map((label) => (
        <li key={label} className={chip.chip}>
          {label}
        </li>
      ))}
    </ul>
  )
}
