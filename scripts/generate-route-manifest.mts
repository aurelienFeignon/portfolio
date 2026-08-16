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
 * **avant** `next build`, or les pages en sont le produit. Elle est donc
 * **confrontée après coup** : `check-static-rendering.mts` la compare aux pages
 * réellement prégénérées, dans les deux sens, et casse le build sur un écart.
 *
 * Le second export, `PASSTHROUGH_PATHS`, dit ce que le serveur sert **sans que ce
 * soit une page** : les fichiers de `public/`, lus sur le disque, et les
 * routes-poignées. Sans lui, le proxy ne pouvait distinguer un fichier réel d'une
 * URL inventée qu'à sa forme — ce qui a été faux deux fois (`phase-4-log.md`
 * §13.3).
 */
import { writeFile } from 'node:fs/promises'

import { contentRepository } from '../src/content/repository.ts'
import { LOCALES, type Locale } from '../src/i18n/locales.ts'
import { entityPath, homePath, sectionPath } from '../src/routing/paths.ts'
import { SECTIONS, SECTIONS_WITH_DETAIL, type SectionWithDetail } from '../src/routing/sections.ts'

import { publicUrlPaths } from './public-paths.mts'

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

/**
 * Les **routes-poignées** de l'App Router : elles répondent, mais ne sont pas
 * des pages et n'ont donc rien à faire dans `SERVED_PATHS`.
 *
 * ⚠️ Cette liste est écrite à la main, et c'est admissible **parce qu'un gate la
 * confronte** : `check-static-rendering.mts` exige que chaque route non-page du
 * build y figure. Une liste manuelle que rien ne vérifie est exactement ce qui a
 * fait disparaître les deux CV.
 */
const ROUTE_HANDLERS = ['/robots.txt', '/sitemap.xml']

/**
 * La destination est un **argument**, comme la racine des deux gates.
 *
 * C'est ce qui rend le générateur exécutable ailleurs que sur le dépôt, donc
 * vérifiable : `tests/integration/route-manifest-is-fresh.test.ts` l'écrit dans
 * un dossier temporaire et compare au fichier committé. Sans cela, la moitié
 * « pages » du manifeste n'avait aucun garde de fraîcheur, alors que la moitié
 * `public/` en a un. Relevé en revue.
 */
const DESTINATION = process.argv[2] ?? new URL('../src/routing/route-manifest.ts', import.meta.url)

const paths = await servedPaths()
const passthrough = [...ROUTE_HANDLERS, ...(await publicUrlPaths())].sort()

/**
 * Le fichier écrit doit être **déjà** au format du dépôt.
 *
 * `JSON.stringify` produit des guillemets doubles, que Prettier réécrit en
 * simples : le fichier oscillait donc entre deux formes, chaque `pnpm build`
 * salissait l'arbre de travail, et `prettier --check` échouait sur un fichier
 * que personne n'avait édité. Un générateur qui ne rend pas la forme finale
 * n'est pas idempotent.
 *
 * Un chemin ne peut pas contenir de guillemet — les slugs sont encodés par
 * `entityPath`, et les locales comme les segments de section sont des littéraux
 * du code. On le **vérifie** plutôt que de l'espérer : le jour où ce n'est plus
 * vrai, il vaut mieux un build cassé qu'un fichier généré syntaxiquement faux.
 */
function asTypeScriptLiteral(values: readonly string[]): string {
  const unsafe = values.filter((value) => /['\\\n]/.test(value))
  if (unsafe.length > 0) {
    throw new Error(
      `Chemin inattendu, non représentable tel quel : ${unsafe.join(', ')}. ` +
        `Les slugs sont pourtant encodés (src/routing/paths.ts).`,
    )
  }

  return `[\n${values.map((value) => `  '${value}',\n`).join('')}]`
}

const content = `/**
 * **Fichier généré — ne pas éditer à la main.**
 *
 * Produit par \`scripts/generate-route-manifest.mts\` avant chaque \`next build\`,
 * puis confronté au build par \`check-static-rendering.mts\` : deux énumérations
 * qui divergent sont la panne que décrit R-07.
 *
 * Il existe pour que \`src/proxy.ts\` sache ce que le serveur peut servir sans
 * lire le disque — ni \`content/\` ni \`public/\` ne sont interrogeables depuis une
 * fonction de proxy, et \`content/\` n'est même pas dans l'image de production.
 */

/** Les **pages** du site. Toute autre URL est réécrite vers la page introuvable. */
export const SERVED_PATHS: readonly string[] = ${asTypeScriptLiteral(paths)}

/**
 * Ce que le serveur sert **sans que ce soit une page** : les fichiers de
 * \`public/\` et les routes-poignées de l'App Router.
 *
 * ⛔ Sans cette liste, le proxy ne pouvait distinguer un fichier réel d'une URL
 * inventée qu'à l'extension — et une adresse inconnue portant un point
 * (\`/wp-login.php\`, \`/cv.pdf\`) échappait alors à la réécriture pour recevoir la
 * 404 interne de Next, hors du layout racine, donc **sans \`lang\`**.
 */
export const PASSTHROUGH_PATHS: readonly string[] = ${asTypeScriptLiteral(passthrough)}
`

await writeFile(DESTINATION, content, 'utf8')
console.log(
  `✓ Manifeste de routes — ${paths.length} page(s), ${passthrough.length} ressource(s) servie(s).`,
)
