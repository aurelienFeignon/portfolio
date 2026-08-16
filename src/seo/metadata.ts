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

import { LOCALE_OPENGRAPH, type Locale } from '../i18n/locales.ts'
import { pathFor, shareImagePath, type PageLocation } from '../routing/paths.ts'

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
  /**
   * Le nom du site et son gabarit de titre (P4-08).
   *
   * Ils viennent du dictionnaire, que `src/seo` ne peut pas lire : la couche ne
   * dépend que d'`i18n` et de `routing` (`architecture.md` §1.2), et le
   * dictionnaire est fourni par l'appelant, comme les locales disponibles.
   */
  readonly site: {
    readonly name: string
    readonly description: string
    readonly titleTemplate: string
  }
}

/**
 * @param siteUrl Injectée pour rester testable sans variable d'environnement.
 * L'application appelle `pageMetadata`, qui lit `SITE_URL` une fois.
 */
/**
 * Le titre **tel qu'un partage l'affichera**.
 *
 * ⚠️ Un `og:title` n'hérite d'aucun gabarit : il est lu tel quel, hors du site.
 * « Projets » seul ne dit pas de qui, alors que la balise `<title>` de la même
 * page, elle, reçoit le suffixe par le layout. Les deux canaux doivent dire la
 * même chose, et un seul des deux le fait tout seul.
 */
function sharedTitle(input: PageMetadataInput): string {
  return input.location.kind === 'home'
    ? input.title
    : input.site.titleTemplate.replace('%s', input.title)
}

/**
 * L'image de partage, **annoncée explicitement**.
 *
 * ⛔ Next l'attache tout seul quand la page ne déclare pas d'`openGraph` ; dès
 * qu'elle en déclare un — ce que fait chaque page ici —, il **remplace** celui du
 * segment parent, image comprise. Le premier build servait donc l'image sans
 * qu'aucune page ne la référence : générée, prégénérée, et invisible.
 *
 * Les dimensions ne sont pas décoratives : sans elles, la plupart des
 * consommateurs téléchargent l'image avant de savoir s'ils peuvent l'afficher en
 * grand, et certains renoncent.
 *
 * L'`alt` est la **transcription** de ce que l'image affiche, et rien d'autre.
 *
 * ⛔ Il décrivait d'abord la **page** (`input.description`), alors que l'image
 * rend toujours la description du **site** : sur toute page sauf l'accueil, il
 * annonçait donc un contenu que le PNG ne montre pas — une description d'image
 * fausse, c'est-à-dire pire qu'absente. Relevé en revue.
 *
 * Le point sépare les deux textes parce que l'image les empile sur deux lignes :
 * ce n'est pas un séparateur de titre, et il n'a donc pas à suivre la
 * typographie par langue du gabarit.
 */
function shareImage(siteUrl: URL, input: PageMetadataInput) {
  return {
    url: buildAbsoluteUrl(siteUrl, shareImagePath(input.locale)),
    width: 1200,
    height: 630,
    alt: `${input.site.name}. ${input.site.description}`,
  }
}

export function buildPageMetadata(siteUrl: URL, input: PageMetadataInput): Metadata {
  const canonical = buildAbsoluteUrl(siteUrl, pathFor(input.locale, input.location))
  const images = [shareImage(siteUrl, input)]

  return {
    /*
     * ⚠️ **L'accueil est le seul titre absolu, et c'est déduit, pas déclaré**
     * (P4-08). Le layout racine porte le gabarit `%s — Aurélien Feignon` ; une
     * chaîne nue le traverse, si bien que « Projets » devient « Projets —
     * Aurélien Feignon » sans que la page connaisse le suffixe.
     *
     * L'accueil, lui, **est** le nom du site : le laisser traverser le gabarit
     * donnerait « Aurélien Feignon — Aurélien Feignon ». Le faire déclarer par
     * la page serait une occasion de l'oublier, pour un oubli qui ne casse rien
     * de visible — juste un titre qui bégaie. L'emplacement le dit déjà.
     */
    title: input.location.kind === 'home' ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: {
      // Toujours l'URL de la page **dans sa propre langue** : une page qui se
      // déclarerait canonique d'une autre se retirerait elle-même de l'index.
      canonical,
      // Construite par `hreflang.ts`, que le sitemap appelle aussi : les deux
      // canaux ne peuvent donc pas se contredire (R-07).
      languages: localeLinks(siteUrl, input.location, input.availableLocales).languages,
    },
    openGraph: {
      type: 'website',
      // La **même** URL que le `canonical`, lue de la même variable : un partage
      // qui désignerait une autre page enverrait ailleurs que sur ce qu'on
      // partage. Les deux ne peuvent pas diverger.
      url: canonical,
      siteName: input.site.name,
      title: sharedTitle(input),
      description: input.description,
      locale: LOCALE_OPENGRAPH[input.locale],
      /*
       * ⚠️ Mêmes locales que le `hreflang`, et pour la même raison : annoncer
       * une alternative vers une traduction absente est une promesse fausse
       * (R-07), sur un autre canal. Le filtre est donc sur `availableLocales`,
       * jamais sur `LOCALES`.
       */
      alternateLocale: input.availableLocales
        .filter((locale) => locale !== input.locale)
        .map((locale) => LOCALE_OPENGRAPH[locale]),
      images,
    },
    twitter: {
      // `summary_large_image` plutôt que `summary` : l'image de partage est au
      // format 1200×630 (P4-08), et une carte `summary` la recadrerait en carré.
      card: 'summary_large_image',
      title: sharedTitle(input),
      description: input.description,
      images,
    },
  }
}

/** Le point d'entrée de l'application : lit `SITE_URL`, puis délègue. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  return buildPageMetadata(getSiteUrl(), input)
}
