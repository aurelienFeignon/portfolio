/**
 * Les liens vers les versions linguistiques d'une page (P3-07).
 *
 * **Un seul constructeur, deux canaux.** Le `hreflang` des balises `<link>` et
 * les `xhtml:link` du `sitemap.xml` disent la même chose au même moteur de
 * recherche, et doivent donc la dire à l'identique. Les deux la construisaient
 * séparément, et avaient **déjà divergé** : le sitemap omettait `x-default` que
 * les métadonnées émettaient toujours. Constaté en revue, corrigé en supprimant
 * la seconde construction plutôt qu'en la réparant.
 *
 * La fonction rend **les deux lectures dont ses appelants ont besoin** — la carte
 * à annoncer et la liste des pages réellement servies. Les faire calculer
 * séparément laisserait le sitemap dériver de ses propres `hreflang`, ce qui est
 * exactement la divergence qu'on vient de fermer.
 *
 * `localeAlternates` décide *quelles* langues existent (risque R-07) ; ce module
 * décide *comment* on les annonce.
 */
import type { Locale } from '../i18n/locales.ts'
import { translatedAlternates } from '../routing/alternates.ts'
import type { PageLocation } from '../routing/paths.ts'

import { buildAbsoluteUrl } from './site-url.ts'

/**
 * La version servie à qui ne parle aucune de nos langues.
 *
 * Elle désigne la **première alternative existante**, et non un choix refait
 * ici : les alternatives suivent l'ordre de `LOCALES`, dont la tête est
 * `DEFAULT_LOCALE`. Un `x-default` vers une page absente serait le même mensonge
 * qu'un `hreflang` vers une page absente.
 */
const X_DEFAULT = 'x-default'

export interface LocaleLinks {
  /** Les URL absolues à annoncer, par code de langue, `x-default` compris. */
  readonly languages: Record<string, string>
  /**
   * Les URL des pages **réellement servies**, dans l'ordre de `LOCALES`. Sans
   * `x-default`, qui est un alias et non une page de plus : l'inscrire au
   * sitemap y ferait figurer deux fois la même URL.
   */
  readonly pages: readonly string[]
}

/**
 * @param availableLocales Les locales où **cette page** existe réellement. Le
 * paramètre est obligatoire, et c'est délibéré : un défaut « toutes les
 * locales » serait juste pour l'accueil et les sections, et **faux pour toute
 * entité** — l'oublier sur une page de détail annoncerait un `hreflang` vers une
 * traduction absente, précisément la panne que cette chaîne existe pour
 * empêcher (R-07). L'omission doit coûter une erreur de compilation.
 */
export function localeLinks(
  siteUrl: URL,
  location: PageLocation,
  availableLocales: readonly Locale[],
): LocaleLinks {
  const alternates = translatedAlternates(location, availableLocales)
  const pages = alternates.map((alternate) => buildAbsoluteUrl(siteUrl, alternate.path))

  const languages: Record<string, string> = {}
  alternates.forEach((alternate, index) => {
    languages[alternate.locale] = pages[index] as string
  })

  const fallback = pages[0]
  if (fallback !== undefined) languages[X_DEFAULT] = fallback

  return { languages, pages }
}
