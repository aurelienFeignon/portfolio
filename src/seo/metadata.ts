/**
 * Métadonnées d'une page : `title`, `description`, `canonical`, `hreflang`
 * (P3-06, P3-07).
 *
 * **Une seule fonction produit toutes les métadonnées du site.** Chaque
 * `generateMetadata` lui donne ce qu'il est seul à savoir — la langue, l'endroit,
 * le titre, la description, et les locales où la page existe vraiment — et reçoit
 * un objet `Metadata` complet. Le `canonical` et les `hreflang` ne sont donc
 * écrits qu'ici, ce qui est la seule façon de garantir qu'ils désignent la même
 * chose.
 *
 * **Confirmation de la contrainte `seo → i18n, routing`** (décision 1 de la
 * phase). Elle avait été posée par défaut en P1-05, faute de métadonnées à
 * écrire. Elle est confirmée telle quelle : ce module lit le vocabulaire des
 * locales, construit des chemins, et n'a besoin de rien d'autre. En particulier,
 * il **ne lit aucun fichier** — les locales réellement disponibles lui sont
 * données par l'appelant, seul autorisé à interroger la couche Content.
 *
 * Le type `Metadata` vient de Next. C'est un import de **type**, effacé à la
 * compilation, et c'est la forme que l'App Router impose : l'envelopper dans un
 * type maison n'ajouterait qu'une traduction à maintenir.
 */
import type { Metadata } from 'next'

import type { Locale } from '../i18n/locales.ts'
import { pathFor, type PageLocation } from '../routing/paths.ts'

import { localeLinks } from './hreflang.ts'
import { buildAbsoluteUrl, getSiteUrl } from './site-url.ts'

export interface PageMetadataInput {
  readonly locale: Locale
  readonly location: PageLocation
  readonly title: string
  readonly description: string
  /**
   * Les locales où **cette page** existe réellement.
   *
   * Obligatoire, et sans valeur par défaut : « toutes les locales » serait juste
   * pour l'accueil et les sections, et **faux pour toute entité**. L'oublier sur
   * une page de détail annoncerait un `hreflang` vers une traduction absente —
   * la panne exacte que R-07 décrit. L'oubli doit coûter une erreur de
   * compilation, pas un test qu'on espère avoir écrit.
   *
   * L'accueil et les sections passent donc `LOCALES` explicitement ; une page de
   * détail passe le résultat de `getContentLocales`.
   */
  readonly availableLocales: readonly Locale[]
}

/**
 * @param siteUrl Injectée pour rester testable sans variable d'environnement.
 * L'application appelle `pageMetadata`, qui lit `SITE_URL` une fois.
 */
export function buildPageMetadata(siteUrl: URL, input: PageMetadataInput): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: {
      // Toujours l'URL de la page **dans sa propre langue** : une page qui se
      // déclarerait canonique d'une autre se retirerait elle-même de l'index.
      canonical: buildAbsoluteUrl(siteUrl, pathFor(input.locale, input.location)),
      // Construite par `hreflang.ts`, que le sitemap appelle aussi : les deux
      // canaux ne peuvent donc pas se contredire (R-07).
      languages: localeLinks(siteUrl, input.location, input.availableLocales).languages,
    },
  }
}

/** Le point d'entrée de l'application : lit `SITE_URL`, puis délègue. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  return buildPageMetadata(getSiteUrl(), input)
}
