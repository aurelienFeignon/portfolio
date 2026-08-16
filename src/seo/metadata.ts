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
import { pathFor, shareImagePath, type PageLocation } from '../routing/paths.ts'

/**
 * La même langue, au format qu'**OpenGraph impose** — `langue_TERRITOIRE`
 * (P4-08).
 *
 * ⚠️ **Ce format affirme un territoire que le site ne porte pas.** Nos locales
 * sont des langues : `fr` ne dit pas « France ». La spécification OpenGraph, elle,
 * n'accepte pas la langue seule, et un consommateur qui ne trouve rien suppose
 * `en_US` — c'est-à-dire qu'omettre le champ affirmerait l'anglais américain sur
 * la page française. Des deux approximations, celle-ci est la moins fausse.
 *
 * C'est la seule entorse au principe de P4-17 (« l'incertitude voyage avec la
 * donnée ») de tout le dépôt, et elle est imposée par un format tiers.
 *
 * ⭐ Elle vit **ici et non dans `i18n`** : `fr_FR` est le vocabulaire d'OpenGraph,
 * pas celui du site. `i18n` est la couche qui ne dépend de rien et qui nomme les
 * langues **du produit** ; lui faire porter un protocole tiers dont elle n'a aucun
 * usage était le mauvais étage. Relevé en revue. Le garde, lui, est le même où
 * qu'elle soit : ajouter une locale sans sa forme OpenGraph ne compile pas.
 */
const LOCALE_OPENGRAPH = {
  fr: 'fr_FR',
  en: 'en_US',
} as const satisfies Record<Locale, string>

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
export function buildPageMetadata(siteUrl: URL, input: PageMetadataInput): Metadata {
  /*
   * ⭐ **Un seul fait, nommé une seule fois** : le titre de l'accueil *est* le
   * nom du site. Il gouverne deux choses — la balise `<title>`, à qui il faut
   * épargner le gabarit du layout, et l'`og:title`, à qui il faut épargner le
   * même gabarit appliqué à la main. Les deux ne peuvent pas légitimement
   * diverger : si elles le faisaient, la page d'accueil s'annoncerait autrement
   * qu'elle ne s'intitule. Le prédicat était écrit deux fois, à cinquante lignes
   * d'écart. Relevé en revue.
   */
  const isHome = input.location.kind === 'home'
  const canonical = buildAbsoluteUrl(siteUrl, pathFor(input.locale, input.location))

  /*
   * Le titre **tel qu'un partage l'affichera**. Un `og:title` n'hérite d'aucun
   * gabarit : il est lu tel quel, hors du site, et « Projets » seul ne dit pas
   * de qui — alors que la balise `<title>` de la même page, elle, reçoit le
   * suffixe par le layout. Les deux canaux doivent dire la même chose, et un
   * seul des deux le fait tout seul.
   */
  const sharedTitle = isHome ? input.title : input.site.titleTemplate.replace('%s', input.title)

  /*
   * L'image de partage, **annoncée explicitement**.
   *
   * ⛔ Next l'attache tout seul quand la page ne déclare pas d'`openGraph` ; dès
   * qu'elle en déclare un — ce que fait chaque page ici —, il **remplace** celui
   * du segment parent, image comprise. Le premier build servait donc l'image
   * sans qu'aucune page ne la référence : générée, prégénérée, et invisible.
   *
   * Les dimensions ne sont pas décoratives : sans elles, la plupart des
   * consommateurs téléchargent l'image avant de savoir s'ils peuvent l'afficher
   * en grand, et certains renoncent.
   *
   * L'`alt` est la **transcription** de ce que l'image affiche, et rien d'autre.
   * Il décrivait d'abord la **page** (`input.description`), alors que l'image
   * rend toujours la description du **site** : sur toute page sauf l'accueil, il
   * annonçait un contenu que le PNG ne montre pas — une description d'image
   * fausse, c'est-à-dire pire qu'absente. Relevé en revue.
   *
   * Le point sépare les deux textes parce que l'image les empile sur deux
   * lignes : ce n'est pas un séparateur de titre, et il n'a donc pas à suivre la
   * typographie par langue du gabarit.
   */
  const images = [
    {
      url: buildAbsoluteUrl(siteUrl, shareImagePath(input.locale)),
      width: 1200,
      height: 630,
      alt: `${input.site.name}. ${input.site.description}`,
    },
  ]

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
     * de visible — juste un titre qui bégaie. L'emplacement le dit déjà, et
     * `isHome` le nomme une fois pour les deux canaux.
     */
    title: isHome ? { absolute: input.title } : input.title,
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
      title: sharedTitle,
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
      title: sharedTitle,
      description: input.description,
      images,
    },
  }
}

/** Le point d'entrée de l'application : lit `SITE_URL`, puis délègue. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  return buildPageMetadata(getSiteUrl(), input)
}
