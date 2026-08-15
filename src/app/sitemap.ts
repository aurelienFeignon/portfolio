/**
 * `sitemap.xml` — dérivé du Content Layer, jamais écrit à la main (P3-08).
 *
 * Cette route **compose** : elle demande au contenu quels slugs existent dans
 * quelle locale, puis délègue toute la logique à `src/seo/sitemap.ts`. C'est ce
 * qui permet de tester le sitemap sans lire un fichier, et donc de le tester du
 * tout — une route de l'App Router n'est vérifiable qu'en E2E.
 *
 * Les compétences n'apparaissent que par leur page de liste : elles n'ont pas de
 * page de détail en v1 (`SECTIONS_WITH_DETAIL`).
 */
import type { MetadataRoute } from 'next'

import { contentRepository } from '@/content/repository'
import { LOCALES, type Locale } from '@/i18n/locales'
import { SECTIONS, SECTIONS_WITH_DETAIL, type SectionWithDetail } from '@/routing/sections'
import { getSiteUrl } from '@/seo/site-url'
import { buildSitemap, entitySitemapPages } from '@/seo/sitemap'

/**
 * Table exhaustive par construction : une section à page de détail sans moyen
 * d'énumérer ses entités ne compile pas.
 */
const LIST_BY_SECTION = {
  experiences: (locale: Locale) => contentRepository.getAllExperiences(locale),
  projects: (locale: Locale) => contentRepository.getAllProjects(locale),
} satisfies Record<SectionWithDetail, (locale: Locale) => Promise<readonly { slug: string }[]>>

async function slugsByLocale(section: SectionWithDetail) {
  const entries = await Promise.all(
    LOCALES.map(async (locale) => {
      const entities = await LIST_BY_SECTION[section](locale)
      return [locale, entities.map((entity) => entity.slug)] as const
    }),
  )
  return Object.fromEntries(entries) as Partial<Record<Locale, readonly string[]>>
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entityPages = await Promise.all(
    SECTIONS_WITH_DETAIL.map(async (section) =>
      entitySitemapPages(section, await slugsByLocale(section)),
    ),
  )

  return buildSitemap(getSiteUrl(), [
    // L'accueil et les sections existent dans toutes les langues, même vides.
    { location: { kind: 'home' }, availableLocales: LOCALES },
    ...SECTIONS.map((section) => ({
      location: { kind: 'section' as const, section },
      availableLocales: LOCALES,
    })),
    ...entityPages.flat(),
  ])
}
