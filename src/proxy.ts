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
 * n'est pas dans l'image. `SERVED_PATHS` est donc produit **avant** le build,
 * alors que les pages en sont le produit : deux énumérations qui n'existent pas
 * au même instant, donc impossibles à fusionner. `check-static-rendering.mts`
 * les confronte **après**, aux pages réellement prégénérées et dans les deux
 * sens — un chemin de trop fait servir la 404 interne de Next, un chemin
 * manquant fait réécrire une page réelle en 404.
 */
import { NextResponse, type NextRequest } from 'next/server'

import { type Locale } from '@/i18n/locales'
import { negotiateLocale } from '@/i18n/negotiate'
import { homePath, localeFromPathname } from '@/routing/paths'
import { SERVED_PATHS } from '@/routing/route-manifest'

const served = new Set(SERVED_PATHS)

/**
 * `/fr/rien` → `fr` ; `/de/x` et `/rien` → la langue négociée.
 *
 * L'URL l'emporte sur l'en-tête : un visiteur qui tape `/en/...` a demandé
 * l'anglais, quelle que soit la langue de son navigateur.
 */
function localeOf(pathname: string, acceptLanguage: string | null): Locale {
  return localeFromPathname(pathname) ?? negotiateLocale(acceptLanguage)
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
  // Aucune garde sur `/` ici : il est traité au-dessus et n'arrive jamais
  // jusqu'à cette ligne. La première version en portait une, et c'était une
  // branche que rien ne pouvait exécuter — la couverture le disait.
  if (served.has(pathname.replace(/\/$/, ''))) return NextResponse.next()

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
   * Tout ce qui peut être une **page**, et rien d'autre.
   *
   * ⛔ La première version énumérait les exceptions à la main
   * (`favicon.ico|robots.txt|sitemap.xml|images/`). Cette liste était fausse
   * dans les deux sens : elle excluait `images/`, qui n'existe pas, et elle
   * ignorait `resume/`, qui existe — si bien que **les deux CV répondaient
   * 404**, alors qu'ils sont en ligne depuis la Phase 2. Trouvé par le parcours
   * E2E de cette tâche, pas par la relecture.
   *
   * Une liste d'exceptions écrite à la main est fausse le jour où quelqu'un
   * ajoute un fichier à `public/` — et elle échoue **en silence**, en servant
   * une 404 sur un fichier réel. Le critère retenu ne s'entretient pas : un
   * chemin de page ne contient jamais de point. Les locales, les segments de
   * section et les slugs sont des minuscules, des chiffres et des traits
   * d'union (P2-02) ; tout ce qui porte une extension est un fichier, servi par
   * Next ou par `public/`, et n'a rien à faire ici.
   *
   * `tests/integration/public-assets-reach-the-visitor.test.ts` confronte ce
   * motif au contenu réel de `public/`, pour que la prochaine ressource ajoutée
   * le vérifie au lieu d'en dépendre.
   */
  matcher: ['/((?!_next/|.*\\.).*)'],
}
