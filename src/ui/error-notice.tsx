'use client'

/**
 * Ce que voit un visiteur quand une page n'a pas pu s'afficher (P4-07).
 *
 * **Écrit une fois pour les deux frontières.** Next en impose deux, et elles ne
 * couvrent pas la même chose : `[locale]/error.tsx` rattrape l'échec d'une page,
 * `global-error.tsx` celui du layout racine lui-même. Elles diffèrent par leur
 * **enveloppe** — la seconde doit rendre son propre `<html>`, n'ayant plus de
 * layout au-dessus d'elle — et par rien d'autre. Ce fichier est ce « rien
 * d'autre ».
 *
 * ⛔ **Aucun détail de l'erreur n'est affiché.** Le message d'une exception peut
 * porter un chemin de fichier ou une valeur d'environnement, et `vision.md` §5.4
 * exige des messages neutres. Le `digest` que Next attache sert à retrouver
 * l'erreur dans les journaux du serveur ; il n'a rien à faire à l'écran.
 *
 * Ce composant est **client**, et il n'a pas le choix : une frontière d'erreur
 * React en est une par définition. C'est le seul JavaScript applicatif du site,
 * et son coût est mesuré dans `phase-4-log.md` §13.
 */
import type { Messages } from '@/i18n/messages'

import styles from './error-notice.module.css'
import lead from './lead.module.css'
import page from './page.module.css'
import accentLink from './accent-link.module.css'

export function ErrorNotice({
  messages,
  homeHref,
  onRetry,
}: {
  readonly messages: Messages
  readonly homeHref: string
  /** `reset()` de Next : retente le rendu du segment, sans recharger la page. */
  readonly onRetry: () => void
}) {
  return (
    <main id="main" className={page.page}>
      <h1 className={page.title}>{messages.error.title}</h1>
      <p className={lead.lead}>{messages.error.message}</p>

      <p className={styles.actions}>
        <button type="button" className={styles.retry} onClick={onRetry}>
          {messages.error.retry}
        </button>
        {/* Le retour à l'accueil est une vraie navigation : si le rendu client
            est en cause, un `<a>` recharge le document et sort de l'impasse là
            où un `router.push` rejouerait le même code. */}
        <a className={accentLink.accentLink} href={homeHref}>
          {messages.backHome}
        </a>
      </p>
    </main>
  )
}
