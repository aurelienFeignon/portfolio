'use client'

/**
 * Frontière d'erreur d'une **page** (P4-07).
 *
 * Elle rattrape ce qui échoue sous le layout racine — donc les pages, et les
 * layouts d'endroit. L'échec du layout racine lui-même est hors de sa portée :
 * c'est `src/app/global-error.tsx`, et c'est pour cela qu'il en faut deux.
 *
 * ⚠️ **La langue vient de l'URL, pas des paramètres de route.** Une frontière
 * d'erreur est un composant client : elle ne reçoit ni `params` ni en-tête de
 * requête. `usePathname` est la seule source disponible, et elle suffit — le
 * chemin porte la locale en premier segment. Le repli sur la locale par défaut
 * ne se produit que là où il n'y en a pas, c'est-à-dire nulle part sous ce
 * segment.
 *
 * Le chrome du site (en-tête, pied de page) reste rendu par le layout racine :
 * cette frontière ne remplace que le contenu.
 */
import { usePathname } from 'next/navigation'

import { getMessages } from '@/i18n/messages'
import { displayedLocale, homePath } from '@/routing/paths'
import { ErrorNotice } from '@/ui/error-notice'

export default function LocaleError({ reset }: { readonly reset: () => void }) {
  const locale = displayedLocale(usePathname())

  return <ErrorNotice messages={getMessages(locale)} homeHref={homePath(locale)} onRetry={reset} />
}
