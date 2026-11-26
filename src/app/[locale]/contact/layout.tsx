/**
 * Layout de la page de contact (P10-06) : déclarer où se trouve le visiteur.
 *
 * `current="contact"` ne marque **rien** dans la navigation — la page n'en fait pas partie tant
 * que l'envoi réel n'est pas validé (P10-07), et n'est pas une section.
 */
import type { ReactNode } from 'react'

import type { LocaleParams } from '../locale-param'
import { PlaceLayout } from '../place-layout'

export default function ContactLayout({
  children,
  params,
}: LocaleParams & { readonly children: ReactNode }) {
  return (
    <PlaceLayout params={params} current="contact">
      {children}
    </PlaceLayout>
  )
}
