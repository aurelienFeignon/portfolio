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

import { negotiateLocale } from '@/i18n/negotiate'
import { homePath, localeFromPathname, notFoundPath } from '@/routing/paths'
import { PASSTHROUGH_PATHS, SERVED_PATHS } from '@/routing/route-manifest'

/**
 * Ce que le serveur peut servir : les pages, plus ce qui n'en est pas une —
 * fichiers de `public/` et routes-poignées. Tout le reste est une 404.
 */
const servable = new Set([...SERVED_PATHS, ...PASSTHROUGH_PATHS])

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
  if (servable.has(pathname.replace(/\/$/, ''))) return NextResponse.next()

  // `/fr/rien` est en français ; `/de/x` et `/rien` prennent la langue négociée.
  // L'URL l'emporte sur l'en-tête : un visiteur qui tape `/en/...` a demandé
  // l'anglais, quelle que soit la langue de son navigateur.
  const fromUrl = localeFromPathname(pathname)
  const locale = fromUrl ?? negotiateLocale(acceptLanguage)

  // ⚠️ Le statut est porté par la réécriture. Une réécriture rend 200 par défaut :
  // servir le bon contenu avec le mauvais statut dirait à un moteur de recherche
  // que la page existe, ce qui est exactement l'inverse du but.
  const response = NextResponse.rewrite(new URL(notFoundPath(locale), request.url), {
    status: 404,
  })

  // ⚠️ `Vary` **seulement quand la négociation a eu lieu**. Quand la locale vient
  // de l'URL, l'en-tête n'a pas été lu : déclarer que la réponse en dépend
  // demanderait au cache partagé une entrée par valeur d'`Accept-Language` — un
  // en-tête à très forte cardinalité — pour des réponses identiques. Et les 404
  // sont le trafic le plus volumineux d'un site public. Relevé en revue.
  if (fromUrl === null) response.headers.set('Vary', 'Accept-Language')
  return response
}

export const config = {
  /*
   * Tout, sauf ce que Next sert depuis son propre build.
   *
   * ⛔⛔ **Deux versions de ce motif ont été fausses, et pour la même raison.**
   * La première énumérait des exceptions à la main
   * (`favicon.ico|robots.txt|sitemap.xml|images/`) : elle citait `images/`, qui
   * n'existe pas, et ignorait `resume/`, si bien que **les deux CV répondaient
   * 404** alors qu'ils sont en ligne depuis la Phase 2. La seconde les excluait
   * par un critère — « un chemin contenant un point est un fichier » — qui
   * laissait passer l'inverse : `/wp-login.php` ou `/cv.pdf`, qui n'existent
   * pas, recevaient la 404 interne de Next, hors du layout racine, donc **sans
   * `lang`**. C'est-à-dire le défaut WCAG 3.1.1 que cette tâche supprime,
   * réintroduit par la porte de derrière. Mesuré sur l'image de production.
   *
   * ⭐ Aucun motif ne peut trancher : seul le disque sait quels fichiers
   * existent. La décision est donc **dans la fonction**, sur des listes
   * générées au build et confrontées au build (`route-manifest.ts`). Le matcher
   * ne borne plus que le coût — `_next/` porte les fragments et les images
   * optimisées, qu'il serait absurde de faire traverser une fonction.
   */
  matcher: ['/((?!_next/).*)'],
}
