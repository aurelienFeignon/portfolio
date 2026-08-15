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
import { translatedAlternates } from '../routing/alternates.ts'
import { pathFor, type PageLocation } from '../routing/paths.ts'

import { buildAbsoluteUrl, getSiteUrl } from './site-url.ts'

export interface PageMetadataInput {
  readonly locale: Locale
  readonly location: PageLocation
  readonly title: string
  readonly description: string
  /**
   * Les locales où **cette page** existe réellement. Par défaut, toutes : c'est
   * le cas de l'accueil et des sections, qui existent même vides. Une page de
   * détail doit passer le résultat de `getContentLocales` (R-07).
   */
  readonly availableLocales?: readonly Locale[]
}

/**
 * @param siteUrl Injectée pour rester testable sans variable d'environnement.
 * L'application appelle `pageMetadata`, qui lit `SITE_URL` une fois.
 */
export function buildPageMetadata(siteUrl: URL, input: PageMetadataInput): Metadata {
  const alternates = translatedAlternates(input.location, input.availableLocales)

  const languages: Record<string, string> = {}
  for (const alternate of alternates) {
    languages[alternate.locale] = buildAbsoluteUrl(siteUrl, alternate.path)
  }

  // `x-default` désigne la page servie à qui ne parle aucune de nos langues. Il
  // pointe vers la locale par défaut **si elle existe pour cette entité**, sinon
  // vers la première disponible : un `x-default` vers une page absente est le
  // même mensonge qu'un `hreflang` vers une page absente (R-07).
  //
  // C'est exactement le premier élément, et non un choix à refaire ici : les
  // alternatives suivent l'ordre de `LOCALES`, dont la tête **est**
  // `DEFAULT_LOCALE` — propriété vérifiée par les tests de `src/i18n/locales`.
  // La première rédaction cherchait explicitement la locale par défaut avant de
  // se replier sur `[0]` ; une mutation a montré les deux branches
  // indistinguables, c'est-à-dire la seconde morte.
  const fallback = alternates[0]
  if (fallback !== undefined) {
    languages['x-default'] = buildAbsoluteUrl(siteUrl, fallback.path)
  }

  return {
    title: input.title,
    description: input.description,
    alternates: {
      // Toujours l'URL de la page **dans sa propre langue** : une page qui se
      // déclarerait canonique d'une autre se retirerait elle-même de l'index.
      canonical: buildAbsoluteUrl(siteUrl, pathFor(input.locale, input.location)),
      languages,
    },
  }
}

/** Le point d'entrée de l'application : lit `SITE_URL`, puis délègue. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  return buildPageMetadata(getSiteUrl(), input)
}
