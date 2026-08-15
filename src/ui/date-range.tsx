/**
 * Une période, avec le cas « en cours » (P3-02).
 *
 * Ce composant existe pour que les routes restent de la **composition pure** :
 * le choix d'afficher « En cours » plutôt qu'une date de fin est une décision de
 * présentation, elle se teste, et elle a deux branches — donc elle n'a rien à
 * faire dans un fichier de route, qui n'est vérifiable qu'en E2E.
 *
 * Les dates sont affichées telles qu'écrites (`AAAA-MM-JJ`). Leur **mise en
 * forme** — « mars 2022 » via `Intl.DateTimeFormat` — est une décision de la
 * Phase 4 : elle suppose de choisir une précision d'affichage, ce que P2-02
 * avait explicitement laissé au rendu.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

export function DateRange({
  locale,
  startedAt,
  endedAt,
  isOngoing,
}: {
  readonly locale: Locale
  readonly startedAt: string
  readonly endedAt?: string | undefined
  readonly isOngoing: boolean
}) {
  const messages = getMessages(locale)

  return (
    <p>
      {/* `<time datetime>` : la date reste lisible par une machine quelle que
          soit la façon dont on l'écrira pour un humain en Phase 4. */}
      <time dateTime={startedAt}>{startedAt}</time>
      {' — '}
      {isOngoing || endedAt === undefined ? (
        messages.ongoing
      ) : (
        <time dateTime={endedAt}>{endedAt}</time>
      )}
    </p>
  )
}
