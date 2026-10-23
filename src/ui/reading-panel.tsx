/**
 * Le panneau de lecture — le seul contenant du contenu, sur sa propre surface
 * (D11, ADR-0004 amendé).
 *
 * ⛔⛔ **Aucun texte ne se pose sur la scène.** Le `<main>` transparent de la
 * Phase 4 peignait le titre et la prose directement sur le canvas : le contraste
 * dépendait de ce qui passait derrière. Le panneau porte un fond opaque, et
 * c'est sur LUI que les contrastes sont calculés (`globals.css`).
 *
 * Deux dispositions :
 *
 * - `aside` — accueil et sections : sur ordinateur, une colonne fixe à gauche,
 *   à défilement propre, et la scène dans le reste de l'écran ; sur mobile, une
 *   feuille sous une bande de scène, dans le flux de la page.
 * - `reading` — fiches : une colonne de lecture centrée, sans scène.
 *
 * ⭐ Composant serveur : aucun octet de JavaScript. `data-reading-panel` est ce
 * que lit `SceneMount` pour cadrer la scène dans l'espace restant — mesuré dans
 * le DOM, jamais recopié.
 */
import type { ReactNode } from 'react'

import styles from './reading-panel.module.css'

export function ReadingPanel({
  variant,
  back,
  children,
}: {
  readonly variant: 'aside' | 'reading'
  /** Le lien de retour vers la vue d'ensemble, absent sur l'accueil. */
  readonly back?: { readonly href: string; readonly label: string }
  readonly children: ReactNode
}) {
  return (
    <main id="main" data-reading-panel={variant} className={styles[variant]}>
      {back ? (
        <a className={styles.back} href={back.href}>
          <span aria-hidden="true">←</span> {back.label}
        </a>
      ) : null}
      {children}
    </main>
  )
}
