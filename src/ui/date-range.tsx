/**
 * Une période, affichée **à la précision qu'elle porte** (P3-02 ; chantier des
 * dates ouvert par P4-04).
 *
 * Ce composant existe pour que les routes restent de la composition pure : le
 * cas « en cours » et la mise en forme ont des branches, elles se testent, et
 * elles n'ont rien à faire dans un fichier de route — vérifiable seulement en
 * E2E.
 *
 * **`endedAt` absent signifie « en cours », et rien d'autre.** Le drapeau
 * `isOngoing` du Content Layer dit exactement cela : le recevoir *en plus* de
 * `endedAt` mettait deux témoins du même fait dans la même condition, dont l'un
 * était mort. Le drapeau reste utile à qui a besoin d'un booléen sans la date.
 *
 * ⭐⭐ **La valeur reçue porte déjà sa précision** — `AAAA`, `AAAA-MM` ou
 * `AAAA-MM-JJ` (`content/schemas/common.ts`). Ce composant ne retranche donc
 * rien : il **met en forme** ce qu'on lui donne, et réémet la valeur *verbatim*
 * dans `datetime`. C'est ce qui rend la propriété vraie par construction plutôt
 * que par vigilance : le domaine du schéma est exactement celui de
 * `<time datetime>` pour une date calendaire.
 *
 * La première version de P4-04 tronquait tout à l'année, ici. Elle n'affirmait
 * rien de faux, mais elle effaçait les dates réellement connues, et ne protégeait
 * que cette vue — P4-09 aurait lu l'entité et réémis la date complète.
 *
 * ⚠️ La mise en forme se fait en **UTC**. Une date ISO nue est interprétée à
 * minuit UTC : formatée dans un fuseau à l'ouest, elle reculerait d'un jour —
 * sans erreur, et seulement sur certaines machines.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

import styles from './date-range.module.css'

/**
 * La précision se lit sur la **forme**, que le schéma garantit : `2021`,
 * `2021-03`, `2021-03-14`. Pas de champ à part, qui pourrait la contredire.
 */
function format(isoDate: string, locale: Locale): string {
  if (isoDate.length === 4) return isoDate

  const options: Intl.DateTimeFormatOptions =
    isoDate.length === 7
      ? { year: 'numeric', month: 'long', timeZone: 'UTC' }
      : { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }

  // `AAAA-MM` seul n'est pas une date : on la complète au premier du mois pour
  // la mise en forme, ce que `month: 'long'` sans `day` n'affichera pas.
  const date = new Date(isoDate.length === 7 ? `${isoDate}-01` : isoDate)

  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function DateRange({
  locale,
  startedAt,
  endedAt,
}: {
  readonly locale: Locale
  readonly startedAt: string
  /** Absent ⇒ période en cours. C'est la dérivation de P2-06, lue à la source. */
  readonly endedAt?: string | undefined
}) {
  const messages = getMessages(locale)

  return (
    <p className={styles.range}>
      <time dateTime={startedAt}>{format(startedAt, locale)}</time>
      {' — '}
      {endedAt === undefined ? (
        <span className={styles.ongoing}>{messages.ongoing}</span>
      ) : (
        <time dateTime={endedAt}>{format(endedAt, locale)}</time>
      )}
    </p>
  )
}
