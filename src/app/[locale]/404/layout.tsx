/**
 * Layout de la page introuvable (P4-07).
 *
 * ⛔ **Il existe parce que son absence a été observée, pas anticipée.** La page
 * introuvable vit directement sous `[locale]`, où aucun layout d'endroit ne la
 * couvrait : elle était donc servie **sans en-tête** — pas de marque, pas de
 * navigation —, avec tous les gates au vert. C'est très exactement la panne que
 * `tests/integration/every-section-declares-its-place.test.ts` décrit pour une
 * quatrième section, sauf qu'elle n'est pas une section et échappait donc au
 * garde. Le parcours E2E de cette tâche l'a trouvée.
 *
 * `current="notFound"` ne marque **rien** : le visiteur n'est ni dans une
 * section, ni à l'accueil. Lui donner `'home'` aurait été plus court et faux —
 * la marque aurait porté `aria-current="page"` sur une page qui n'est pas
 * l'accueil.
 */
import type { ReactNode } from 'react'

import type { LocaleParams } from '../locale-param'
import { PlaceLayout } from '../place-layout'

export default function NotFoundLayout({
  children,
  params,
}: LocaleParams & { readonly children: ReactNode }) {
  return (
    <PlaceLayout params={params} current="notFound">
      {children}
    </PlaceLayout>
  )
}
