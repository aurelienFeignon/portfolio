/**
 * Layout de la section « projects » (P4-02).
 *
 * Son unique raison d'être : **déclarer où se trouve le visiteur**. Le layout
 * racine ne peut pas le savoir, et l'App Router ne le lui dit pas — voir
 * `../place-layout.tsx` pour le raisonnement complet. Ici la valeur n'est pas
 * déduite, elle est constante : ce layout ne couvre que cette section.
 */
import type { ReactNode } from 'react'

import type { LocaleParams } from '../locale-param'
import { PlaceLayout } from '../place-layout'

export default function ProjectsLayout({
  children,
  params,
}: LocaleParams & { readonly children: ReactNode }) {
  return (
    <PlaceLayout params={params} current="projects">
      {children}
    </PlaceLayout>
  )
}
