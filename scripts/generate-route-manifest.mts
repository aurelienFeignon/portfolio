/**
 * Énumère les chemins que le site sert réellement, pour que le proxy puisse
 * reconnaître une URL inconnue (P4-07).
 *
 * **Pourquoi un fichier généré, et pas une lecture à l'exécution.** `content/`
 * n'est pas copié dans l'image de production : le proxy ne peut pas demander au
 * Content Layer quels slugs existent. Il lui faut la liste **gravée au build**,
 * comme les `canonical` et le sitemap le sont déjà.
 *
 * **Pourquoi le proxy en a besoin.** Sans elle, il ne peut classer que ce que la
 * structure trahit — une locale inconnue, une section inconnue. Un *slug*
 * inconnu (`/fr/projects/inconnu`) est indiscernable d'un slug valide, et c'est
 * précisément le cas que P4-07 doit rendre en français.
 *
 * ⚠️ **Cette énumération est la seconde du dépôt**, après celle du sitemap
 * (`src/app/sitemap.ts`) — et deux énumérations qui divergent, c'est la panne que
 * R-07 décrit. Elle ne peut pas être évitée : le proxy a besoin de la liste
 * **avant** `next build`, or le sitemap est un produit de ce build. Elle est donc
 * **confrontée après coup** : `check-static-rendering.mts` compare le manifeste
 * au sitemap servi et casse le build s'ils diffèrent.
 */
import { writeFile } from 'node:fs/promises'

import { contentRepository } from '../src/content/repository.ts'
import { LOCALES, type Locale } from '../src/i18n/locales.ts'
import { entityPath, homePath, sectionPath } from '../src/routing/paths.ts'
import { SECTIONS, SECTIONS_WITH_DETAIL, type SectionWithDetail } from '../src/routing/sections.ts'

/**
 * Table exhaustive par construction, comme celle du sitemap : une section à page
 * de détail sans moyen d'énumérer ses entités ne compile pas.
 */
const LIST_BY_SECTION = {
  experiences: (locale: Locale) => contentRepository.getAllExperiences(locale),
  projects: (locale: Locale) => contentRepository.getAllProjects(locale),
} satisfies Record<SectionWithDetail, (locale: Locale) => Promise<readonly { slug: string }[]>>

async function servedPaths(): Promise<readonly string[]> {
  const entityPaths = await Promise.all(
    LOCALES.flatMap((locale) =>
      SECTIONS_WITH_DETAIL.map(async (section) => {
        const entities = await LIST_BY_SECTION[section](locale)
        return entities.map((entity) => entityPath(locale, section, entity.slug))
      }),
    ),
  )

  return [
    ...LOCALES.map(homePath),
    ...LOCALES.flatMap((locale) => SECTIONS.map((section) => sectionPath(locale, section))),
    ...entityPaths.flat(),
  ].sort()
}

const DESTINATION = new URL('../src/routing/route-manifest.ts', import.meta.url)

const paths = await servedPaths()

const content = `/**
 * **Fichier généré — ne pas éditer à la main.**
 *
 * Produit par \`scripts/generate-route-manifest.mts\` avant chaque \`next build\`,
 * et confronté au sitemap servi juste après par \`check-static-rendering.mts\` :
 * deux énumérations qui divergent sont la panne que décrit R-07.
 *
 * Il existe pour que \`src/proxy.ts\` reconnaisse une URL inconnue sans lire
 * \`content/\`, absent de l'image de production.
 */
export const SERVED_PATHS: readonly string[] = ${JSON.stringify(paths, null, 2)}
`

await writeFile(DESTINATION, content, 'utf8')
console.log(`✓ Manifeste de routes — ${paths.length} chemin(s) servi(s).`)
