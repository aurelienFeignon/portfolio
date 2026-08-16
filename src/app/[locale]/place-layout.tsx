/**
 * Le layout d'un **endroit** du site : son en-tête, puis son contenu (P4-02).
 *
 * **Pourquoi l'en-tête n'est pas dans le layout racine.** Marquer le lien de la
 * section active suppose de savoir quelle section est affichée. Un layout Next
 * ne reçoit pas les segments de route situés **sous** lui : il n'existe pour
 * cela qu'un seul mécanisme, `useSelectedLayoutSegment`, et il impose un
 * **composant client**. C'est là que le refus se joue, et il est chiffré plutôt
 * qu'absolu — un composant client, c'est du JavaScript sur les 16 routes, donc
 * la fin des 0,0 Ko et du profil `no-js` vrai *par construction*, qui est la
 * contrainte 1 de l'ADR-0010. Le dire ainsi évite qu'une session suivante
 * redécouvre le hook et croie le raisonnement erroné.
 *
 * Lire l'URL par `headers()` est fermé pour une autre raison : la route
 * deviendrait dynamique, ce que refuse le gate de
 * `scripts/check-static-rendering.mts` — et `content/` n'étant pas dans l'image
 * de production, elle échouerait **en production**, jamais au build.
 *
 * Ne reste que l'arborescence elle-même : chaque endroit a son layout, et chacun
 * n'a qu'une valeur possible à déclarer. `every-section-declares-its-place.test.ts`
 * garde l'accord entre les deux — sans quoi une quatrième section aurait sa
 * route, son lien et son entrée au sitemap, mais **aucun en-tête**.
 *
 * Ce fichier ne rend que l'en-tête, pas le pied de page : celui-ci n'a besoin de
 * rien savoir de la page, et vit donc au layout racine, écrit une seule fois.
 *
 * Les liens viennent de `section-links.ts` : l'accueil en a besoin des mêmes, et
 * l'App Router ne fait pas descendre de valeur d'un layout vers une page.
 */
import type { ReactNode } from 'react'

import { homePath } from '@/routing/paths'
import { SiteHeader, type CurrentPlace } from '@/ui/site-header'

import { readLocale, type LocaleParams } from './locale-param'
import { sectionLinks } from './section-links'

export async function PlaceLayout({
  params,
  current,
  children,
}: LocaleParams & {
  readonly current: CurrentPlace
  readonly children: ReactNode
}) {
  const locale = await readLocale(params)

  return (
    <>
      <SiteHeader
        locale={locale}
        homeHref={homePath(locale)}
        links={sectionLinks(locale)}
        current={current}
      />
      {children}
    </>
  )
}
