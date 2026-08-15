/**
 * `/` négocie la langue et redirige (P3-03) — `architecture.md` §4.2.
 *
 * **Le fichier s'appelle `proxy.ts`, et non `middleware.ts`.** Next 16.3 déprécie
 * la seconde convention et le dit au build : *« The "middleware" file convention
 * is deprecated. Please use "proxy" instead. »* Le nom a été changé à
 * l'écriture — adopter aujourd'hui une convention annoncée obsolète reviendrait à
 * planifier une migration pour rien.
 *
 * **Pourquoi ici, et non dans une page.** Toutes les pages de contenu sont
 * statiques, et doivent le rester : `content/` n'est pas dans l'image de
 * production (`phase-2-log.md` §9.4). Une page `/` qui lirait `Accept-Language`
 * serait, elle, rendue à la demande — donc la seule route dynamique du site, dans
 * le dossier même où l'on veut prouver qu'il n'y en a aucune.
 *
 * Le middleware sort ce cas du graphe de routes : il ne lit aucun contenu, ne
 * s'exécute que sur `/`, et laisse toutes les autres URL intactes. C'est
 * exactement la « redirection edge » que l'architecture prévoyait.
 *
 * **307 et non 301** : la cible dépend de l'en-tête du visiteur. Une redirection
 * permanente serait mémorisée par le navigateur du premier visiteur et servie à
 * tous les suivants, quelle que soit leur langue.
 */
import { NextResponse, type NextRequest } from 'next/server'

import { negotiateLocale } from '@/i18n/negotiate'
import { homePath } from '@/routing/paths'

export default function proxy(request: NextRequest) {
  const locale = negotiateLocale(request.headers.get('accept-language'))
  const response = NextResponse.redirect(new URL(homePath(locale), request.url))

  // Sans cet en-tête, un cache partagé — Cloudflare est devant ce site
  // (`deploy/README.md` §2) — mémoriserait la redirection du premier visiteur et
  // enverrait tous les anglophones suivants vers `/fr`. Le mode de panne est
  // silencieux : le site fonctionne, il répond simplement dans la mauvaise langue.
  response.headers.set('Vary', 'Accept-Language')
  return response
}

export const config = {
  // `/` et rien d'autre. Un matcher plus large ferait passer chaque page statique
  // par une fonction, ce qui coûterait à chaque requête pour ne rien décider.
  matcher: '/',
}
