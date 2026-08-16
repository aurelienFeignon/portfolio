'use client'

/**
 * Frontière d'erreur du **layout racine** (P4-07).
 *
 * ⚠️ **C'est la seule exception de Next : elle rend son propre `<html>` et son
 * propre `<body>`.** Elle remplace le layout racine, qui est justement ce qui a
 * échoué — il n'y a donc plus d'enveloppe au-dessus d'elle. En omettre une
 * produit un document sans racine ; en rendre deux — ce que fait toute tentative
 * de la traiter comme une page ordinaire — produit deux `<html>`.
 *
 * Pour la même raison, elle importe `globals.css` elle-même : la feuille est
 * chargée par le layout racine, absent ici. Sans cet import, la page d'erreur
 * s'afficherait sans tokens, sans police et sans style de focus.
 *
 * ⚠️ **`lang` ne peut pas être omis** (WCAG 3.1.1). C'est le défaut exact que
 * P4-07 corrige sur la 404 : la page d'erreur interne de Next est servie hors de
 * tout layout, donc sans langue déclarée. La déduire de l'URL est ce qui reste
 * quand tout le reste a échoué.
 *
 * Un `global-error.tsx` avait été écrit en Phase 3 puis **retiré** : il y
 * traitait un symptôme dont la cause était un `NODE_ENV=development`
 * (`phase-3-log.md` §10.1). Celui-ci est demandé par P4-07, et il rend une page
 * localisée — ce que le précédent ne faisait pas.
 */
import { usePathname } from 'next/navigation'

import { getMessages } from '@/i18n/messages'
import { displayedLocale, homePath } from '@/routing/paths'
import { ErrorNotice } from '@/ui/error-notice'

import './globals.css'

export default function GlobalError({ reset }: { readonly reset: () => void }) {
  const locale = displayedLocale(usePathname())

  return (
    <html lang={locale}>
      <body>
        <ErrorNotice messages={getMessages(locale)} homeHref={homePath(locale)} onRetry={reset} />
      </body>
    </html>
  )
}
