/**
 * Layout de l'accueil (P4-02).
 *
 * L'accueil n'a pas de segment d'URL à lui : il **est** `/[locale]`. Le groupe
 * de routes `(home)` — des parenthèses, donc aucun segment ajouté — lui donne
 * néanmoins un layout propre, ce qui met les quatre endroits du site sur le même
 * plan : chacun déclare où il se trouve, aucun ne le devine.
 *
 * L'alternative aurait été de laisser l'accueil rendre son en-tête lui-même,
 * pendant que les trois sections le reçoivent de leur layout. Deux mécanismes
 * pour une seule chose, et la page d'accueil de P4-03 aurait hérité d'une
 * responsabilité qui n'est pas la sienne.
 *
 * `current="home"` marque la **marque** plutôt qu'un lien de section : l'accueil
 * n'en est aucune, et `SiteHeader` en tire la conséquence.
 */
import type { ReactNode } from 'react'

import type { LocaleParams } from '../locale-param'
import { PlaceLayout } from '../place-layout'

export default function HomeLayout({
  children,
  params,
}: LocaleParams & { readonly children: ReactNode }) {
  return (
    <PlaceLayout params={params} current="home">
      {children}
    </PlaceLayout>
  )
}
