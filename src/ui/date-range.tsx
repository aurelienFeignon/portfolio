/**
 * Une période, avec le cas « en cours » (P3-02, précision tranchée en P4-04).
 *
 * Ce composant existe pour que les routes restent de la **composition pure** :
 * le choix d'afficher « En cours » plutôt qu'une date de fin est une décision de
 * présentation, elle se teste, et elle a deux branches — donc elle n'a rien à
 * faire dans un fichier de route, qui n'est vérifiable qu'en E2E.
 *
 * **`endedAt` absent signifie « en cours », et rien d'autre.** Le drapeau
 * `isOngoing` du Content Layer dit exactement cela (`normalise.ts`) : le
 * recevoir *en plus* de `endedAt` mettait deux témoins du même fait dans la même
 * condition, dont l'un était mort — et rien ne disait lequel faisait autorité.
 * Le drapeau reste utile à qui a besoin d'un booléen sans la date ; une vue qui
 * a la date n'en a pas besoin. Relevé en revue.
 *
 * **La précision d'affichage est l'année.** P2-02 avait laissé ce choix au
 * rendu ; il est fait ici. Le CV source ne donne que des années, le schéma exige
 * un jour, et `content/` porte donc des 1ᵉʳ janvier d'attente (décision D1,
 * ouverte). Écrire « janvier 2021 » afficherait comme un fait un mois que
 * personne ne connaît.
 *
 * ⚠️ `datetime` porte la **même** précision que ce qui est montré : un
 * `datetime="2021-01-01"` affirmerait ce jour à un moteur de recherche.
 * `datetime="2021"` est une valeur `<time>` valide, et c'est la seule qui dise
 * ce que l'on sait.
 *
 * ⛔ **Cette troncature est inconditionnelle, et c'est une dette nommée.** Elle
 * dit moins que la donnée — donc elle n'affirme jamais rien de faux —, mais elle
 * efface aussi une précision **réellement connue** là où il y en a une : le
 * projet « portfolio » de `content/` porte un jour exact. Et elle ne protège
 * que cette vue : P4-09 lira `startedAt` sur l'entité et réémettra la date
 * complète, sans que rien ne l'en empêche. Le correctif au bon niveau est de
 * faire voyager l'incertitude **avec la donnée** — `isoDateSchema` acceptant
 * `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`, soit exactement le domaine de
 * `<time datetime>`. C'est un **préalable de P4-09**, inscrit comme tel
 * (`phase-4-log.md` §9.6).
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

import styles from './date-range.module.css'

/** `2021-03-14` → `2021`. Découpe et non `Date`, qui décalerait selon le fuseau. */
function year(isoDate: string): string {
  return isoDate.slice(0, 4)
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
      <time dateTime={year(startedAt)}>{year(startedAt)}</time>
      {' — '}
      {endedAt === undefined ? (
        <span className={styles.ongoing}>{messages.ongoing}</span>
      ) : (
        <time dateTime={year(endedAt)}>{year(endedAt)}</time>
      )}
    </p>
  )
}
