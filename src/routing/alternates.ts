/**
 * La même page dans les autres langues (P3-07, P3-08, P3-09).
 *
 * **Une seule fonction pour trois usages**, parce qu'ils posent la même question
 * et qu'ils doivent y répondre pareil :
 *
 * | Consommateur | Ce qu'il lit |
 * |---|---|
 * | `hreflang` (P3-07) | `path`, en ignorant les `null` — R-07 |
 * | `sitemap.xml` (P3-08) | idem |
 * | Sélecteur de langue (P3-09) | `path ?? fallbackPath`, et `translated` pour le dire |
 *
 * Si ces trois-là calculaient chacun leur réponse, le jour où l'un dérive le
 * `hreflang` annoncerait une page que le sitemap ignore et que le sélecteur
 * n'atteint pas. C'est exactement la panne que le risque R-07 décrit : une
 * promesse fausse faite à un moteur de recherche.
 *
 * La fonction est **pure**. Les locales réellement disponibles lui sont données
 * (`getContentLocales`, P2-05) : `src/routing` ne lit pas de fichier, et ne peut
 * pas importer `src/content` (`architecture.md` §1.2).
 */
import { LOCALES, type Locale } from '../i18n/locales.ts'

import { fallbackLocation, pathFor, type PageLocation } from './paths.ts'

export interface LocaleAlternate {
  readonly locale: Locale
  /**
   * Le chemin de **cette** page dans cette locale, ou `null` si elle n'y existe
   * pas. Un `null` ne doit jamais devenir un `hreflang`.
   */
  readonly path: string | null
  /** Toujours atteignable : la page elle-même, ou sa section (voir `fallbackLocation`). */
  readonly fallbackPath: string
  readonly translated: boolean
}

/**
 * @param availableLocales Les locales où l'entité existe réellement. Pour
 * l'accueil et les sections, ce sont toutes les locales : ces pages existent
 * toujours, même vides.
 */
export function localeAlternates(
  location: PageLocation,
  availableLocales: readonly Locale[] = LOCALES,
): readonly LocaleAlternate[] {
  // L'ordre est celui de `LOCALES`, jamais celui de `availableLocales` : un
  // sitemap ou un jeu de balises `hreflang` ne doit pas changer d'ordre d'un
  // build à l'autre, sinon chaque déploiement produit un diff qui ne dit rien.
  return LOCALES.map((locale) => {
    const translated = availableLocales.includes(locale)
    return {
      locale,
      path: translated ? pathFor(locale, location) : null,
      fallbackPath: pathFor(locale, translated ? location : fallbackLocation(location)),
      translated,
    }
  })
}

/** Les seules locales qu'un `hreflang` ou un sitemap a le droit d'annoncer (R-07). */
export function translatedAlternates(
  location: PageLocation,
  availableLocales: readonly Locale[] = LOCALES,
): readonly (LocaleAlternate & { path: string })[] {
  return localeAlternates(location, availableLocales).filter(
    (alternate): alternate is LocaleAlternate & { path: string } => alternate.path !== null,
  )
}
