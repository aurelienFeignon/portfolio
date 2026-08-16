/**
 * Négociation de la langue à la racine (P3-03), et **404 localisée** (P4-07) —
 * `architecture.md` §4.2.
 *
 * **Le fichier s'appelle `proxy.ts`, et non `middleware.ts`.** Next 16.3 déprécie
 * la seconde convention et le dit au build. Adopter aujourd'hui une convention
 * annoncée obsolète reviendrait à planifier une migration pour rien.
 *
 * **Pourquoi ici, et non dans une page.** Toutes les pages de contenu sont
 * statiques et doivent le rester : `content/` n'est pas dans l'image de
 * production. Une page `/` qui lirait `Accept-Language` serait la seule route
 * dynamique du site, dans le dossier même où l'on veut prouver qu'il n'y en a
 * aucune.
 *
 * ## Pourquoi le matcher n'est plus `/` seul
 *
 * Il l'était, avec cette raison : « un matcher plus large ferait passer chaque
 * page statique par une fonction, ce qui coûterait à chaque requête pour ne rien
 * décider ». Elle était juste, et elle ne l'est plus : il y a désormais quelque
 * chose à décider.
 *
 * ⚠️ **Sans ce détour, une URL inconnue est servie par la 404 interne de Next,
 * hors de tout layout racine** — le nôtre vit sous `[locale]`. Trois sondes l'ont
 * établi (`phase-4-log.md` §13.1) : pas de `<html lang>`, ce qui est une
 * violation WCAG 3.1.1 que le gate axe n'a jamais vue faute de parcours sur une
 * 404 ; aucun paramètre transmis ; et une enveloppe rendue par le composant
 * produit **deux** `<html>`. `[locale]/not-found.tsx` n'est jamais atteint non
 * plus : `dynamicParams = false` fait du slug inconnu un échec de **routage**,
 * pas un `notFound()`.
 *
 * Le coût est réel et assumé : chaque requête traverse cette fonction. Il est
 * borné par le matcher, et le site est derrière un cache partagé
 * (`deploy/README.md` §2) qui absorbe l'essentiel.
 *
 * ## Pourquoi une liste gravée
 *
 * Le proxy ne peut pas demander au Content Layer quels slugs existent : `content/`
 * n'est pas dans l'image. `SERVED_PATHS` est donc produit **avant** le build et
 * confronté au sitemap **après** — deux énumérations qui divergent sont la panne
 * que décrit R-07, et c'est le gate de rendu statique qui l'empêche.
 */
import { NextResponse, type NextRequest } from 'next/server'

import { isLocale, type Locale } from '@/i18n/locales'
import { negotiateLocale } from '@/i18n/negotiate'
import { homePath } from '@/routing/paths'
import { SERVED_PATHS } from '@/routing/route-manifest'

const served = new Set(SERVED_PATHS)

/** `/fr/rien` → `fr` ; `/de/x` et `/rien` → la langue négociée. */
function localeOf(pathname: string, acceptLanguage: string | null): Locale {
  const candidate = pathname.split('/')[1]
  return candidate !== undefined && isLocale(candidate)
    ? candidate
    : negotiateLocale(acceptLanguage)
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const acceptLanguage = request.headers.get('accept-language')

  if (pathname === '/') {
    const url = new URL(homePath(negotiateLocale(acceptLanguage)), request.url)
    const redirect = NextResponse.redirect(url)

    // Sans cet en-tête, un cache partagé mémoriserait la redirection du premier
    // visiteur et enverrait tous les anglophones suivants vers `/fr`. Le mode de
    // panne est silencieux : le site répond, simplement dans la mauvaise langue.
    redirect.headers.set('Vary', 'Accept-Language')
    return redirect
  }

  // Une barre finale désigne la même page : `/fr/projects/` est `/fr/projects`.
  const normalised = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  if (served.has(normalised)) return NextResponse.next()

  // ⚠️ Le statut est porté par la réécriture. Une réécriture rend 200 par défaut :
  // servir le bon contenu avec le mauvais statut dirait à un moteur de recherche
  // que la page existe, ce qui est exactement l'inverse du but.
  const response = NextResponse.rewrite(
    new URL(`${homePath(localeOf(pathname, acceptLanguage))}/404`, request.url),
    { status: 404 },
  )
  response.headers.set('Vary', 'Accept-Language')
  return response
}

export const config = {
  /*
   * Tout, sauf ce que Next sert lui-même et les ressources qui n'ont pas de
   * page : les faire traverser cette fonction coûterait à chaque requête pour
   * ne rien décider — la raison qui bornait autrefois le matcher à `/`.
   */
  matcher: ['/((?!_next/|favicon\\.ico|robots\\.txt|sitemap\\.xml|images/).*)'],
}
