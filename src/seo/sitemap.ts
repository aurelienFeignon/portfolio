/**
 * Construction du `sitemap.xml` (P3-08).
 *
 * **Pure, et séparée de la lecture du contenu.** La route `app/sitemap.ts` va
 * chercher ce qui existe ; cette fonction décide de la forme. C'est ce qui permet
 * de tester le point qui compte — *le sitemap contient exactement les entités
 * existantes* — sans lire un seul fichier.
 *
 * **Une entrée par page réellement servie**, et ses alternatives. Une entrée par
 * entité, avec les deux langues dedans, dirait à un moteur qu'il existe une URL
 * unique par entité : c'est faux, `/fr/projects/augure` et `/en/projects/augure`
 * sont deux pages (critère de sortie de la phase).
 *
 * Le sitemap et le `hreflang` lisent la **même** source (`translatedAlternates`) :
 * ils ne peuvent donc pas se contredire, et c'est tout l'objet de R-07.
 */
import type { MetadataRoute } from 'next'

import { LOCALES, type Locale } from '../i18n/locales.ts'
import { translatedAlternates } from '../routing/alternates.ts'
import type { PageLocation } from '../routing/paths.ts'
import type { Section } from '../routing/sections.ts'

import { buildAbsoluteUrl } from './site-url.ts'

export interface SitemapPage {
  readonly location: PageLocation
  /** Les locales où la page existe. Absent ⇒ toutes (accueil, sections). */
  readonly availableLocales?: readonly Locale[]
}

/**
 * Les pages de détail d'une section, à partir des slugs présents dans chaque
 * locale.
 *
 * **L'union, jamais l'intersection.** Une entité qui n'existe qu'en français
 * doit figurer au sitemap — dans sa langue seulement. La lire depuis une locale
 * unique la ferait disparaître de l'index sans que rien ne le signale.
 *
 * Les locales disponibles se **déduisent** de ces listes : interroger
 * `getContentLocales` en plus poserait deux fois la même question au même
 * contenu, avec le risque que les deux réponses divergent.
 */
export function entitySitemapPages(
  section: Section,
  slugsByLocale: Readonly<Partial<Record<Locale, readonly string[]>>>,
): readonly SitemapPage[] {
  const slugs = new Set(Object.values(slugsByLocale).flat())

  // Trié : le sitemap ne doit pas changer d'ordre d'un build à l'autre, sinon
  // chaque déploiement produit un diff qui ne dit rien.
  return [...slugs].sort().map((slug) => ({
    location: { kind: 'entity', section, slug },
    availableLocales: LOCALES.filter((locale) => slugsByLocale[locale]?.includes(slug) === true),
  }))
}

export function buildSitemap(siteUrl: URL, pages: readonly SitemapPage[]): MetadataRoute.Sitemap {
  return pages.flatMap(({ location, availableLocales }) => {
    const alternates = translatedAlternates(location, availableLocales)

    const languages: Record<string, string> = {}
    for (const alternate of alternates) {
      languages[alternate.locale] = buildAbsoluteUrl(siteUrl, alternate.path)
    }

    return alternates.map((alternate) => ({
      url: buildAbsoluteUrl(siteUrl, alternate.path),
      // Chaque entrée annonce **toutes** les versions existantes, y compris la
      // sienne : c'est ce que Google attend pour reconnaître un groupe de
      // traductions. Une entité absente d'une langue n'y figure simplement pas.
      alternates: { languages },
    }))
  })
}
