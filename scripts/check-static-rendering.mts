/**
 * Aucune route ne doit pouvoir se rendre à la demande, et le sitemap doit les
 * connaître toutes (P3-02, P3-08).
 *
 * **Pourquoi c'est un gate et pas une revue.** `content/` n'est pas copié dans
 * l'image de production : la lecture des fichiers a lieu au build, toutes les
 * pages étant statiques. Une route qui se rendrait à la demande chercherait donc
 * un dossier absent — et elle échouerait **en production**, à la première visite
 * d'une URL non prégénérée, jamais au build. C'est la dette tracée en Phase 2
 * (`phase-2-log.md` §9.4), et la Phase 3 est le moment où elle devient réelle.
 *
 * **Quatre contrôles, et aucun ne se contente de « j'ai vu au moins une chose ».**
 *
 * 1. *Rendu* — chaque route applicative est prégénérée, ou close par
 *    `dynamicParams = false`.
 * 2. *Régime* — chaque page prégénérée l'est en `static`. Un régime **inconnu**
 *    est refusé, pas ignoré : c'est ainsi qu'un ISR ou un PPR introduit par une
 *    montée de version se signale au lieu de passer.
 * 3. *Sitemap* — le sitemap et les pages prégénérées se recouvrent **exactement**.
 *    Une page absente de l'index ne sera pas indexée et échappe au contrôle E2E
 *    de R-07, qui ne parcourt que les URL du sitemap ; une URL annoncée sans page
 *    derrière promet à un moteur de recherche une adresse qui répond 404.
 * 4. *Proxy* — le manifeste que lit `src/proxy.ts` décrit **exactement** les
 *    pages servies (P4-07). Voir plus bas : c'est le contrôle dont les deux sens
 *    sont des pannes silencieuses de nature différente.
 *
 * ## Pourquoi tout est confronté aux pages prégénérées, et jamais à un pair
 *
 * Trois énumérations existent : ce que Next a **réellement** prégénéré, ce que le
 * sitemap **annonce**, et ce que le proxy **laisse passer**. Les deux dernières
 * sont dérivées ; seule la première est le fait. Chacune est donc comparée au
 * fait, jamais à l'autre dérivée — sinon un écart entre les deux accuse celle qui
 * n'a pas tort, et le message envoie corriger le mauvais fichier.
 *
 * ⚠️ Le manifeste du proxy est produit **avant** `next build` (le proxy est
 * compilé avec) alors que les pages en sont le produit : les deux énumérations ne
 * peuvent pas être fusionnées, elles n'existent pas au même moment. C'est
 * exactement la situation que décrit R-07, et ce contrôle est ce qui l'empêche
 * de devenir une panne.
 *
 * La racine et le manifeste sont des **arguments**, comme pour
 * `scripts/check-content.mts` : c'est ce qui rend le gate exécutable contre des
 * manifestes de fixture, donc testable. Un gate qui protège toute la production
 * ne peut pas n'être vérifié que par une observation manuelle.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const nextDir = process.argv[2] ?? '.next'
const routeManifestPath = process.argv[3] ?? join('src', 'routing', 'route-manifest.ts')

interface PrerenderManifest {
  readonly routes: Record<string, { readonly compute?: string; readonly routeType?: string }>
  readonly dynamicRoutes: Record<string, { readonly fallback: unknown }>
}

/**
 * Les routes internes de Next (`/_not-found`, `/_global-error`) ne lisent aucun
 * contenu, n'ont pas de `generateStaticParams` et n'ont rien à faire au sitemap.
 */
function isInternal(route: string): boolean {
  return route.startsWith('/_')
}

/**
 * La page **introuvable** est prérendue comme les autres, et n'a rien à faire au
 * sitemap : elle est servie en 404 par réécriture du proxy (P4-07), elle porte
 * `noindex`, et rien ne la lie. L'annoncer à un moteur de recherche reviendrait
 * à lui promettre une page qui répond 404.
 *
 * ⚠️ L'exception est **nommée** plutôt que déduite d'un préfixe : `/_` désigne
 * les routes internes de Next, et étendre ce préfixe à nos propres pages aurait
 * ouvert une porte que personne n'aurait refermée.
 */
function isNotFoundPage(route: string): boolean {
  return route.endsWith('/404')
}

function read<T>(name: string): T {
  const path = join(nextDir, name)
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (error) {
    console.error(
      `✗ ${path} est illisible : ce contrôle doit suivre un « next build » réussi.\n  ${String(error)}`,
    )
    process.exit(1)
  }
}

/**
 * La liste que le proxy embarque. Son absence n'est pas « rien à vérifier » :
 * sans elle le proxy ne peut classer aucune URL, et le build est cassé.
 */
async function readServedPaths(): Promise<readonly string[]> {
  try {
    const manifest = (await import(pathToFileURL(resolve(routeManifestPath)).href)) as {
      SERVED_PATHS?: readonly string[]
    }
    if (manifest.SERVED_PATHS === undefined) throw new Error('SERVED_PATHS n’y est pas exporté')
    return manifest.SERVED_PATHS
  } catch (error) {
    console.error(
      `✗ Le manifeste de routes ${routeManifestPath} est illisible : il est produit par\n` +
        `  « scripts/generate-route-manifest.mts », avant « next build ».\n  ${String(error)}`,
    )
    process.exit(1)
  }
}

/** Ce que le site sert vraiment : le fait auquel les deux dérivées sont comparées. */
function difference(left: Iterable<string>, right: ReadonlySet<string>): readonly string[] {
  return [...left].filter((value) => !right.has(value))
}

const appRoutes = Object.values(read<Record<string, string>>('app-path-routes-manifest.json'))
const pageRoutes = appRoutes.filter((route) => !isInternal(route)).sort()

const prerender = read<PrerenderManifest>('prerender-manifest.json')

const problems: string[] = []

// --- 1. Rendu ---------------------------------------------------------------
for (const route of pageRoutes) {
  const dynamic = prerender.dynamicRoutes[route]

  if (dynamic !== undefined) {
    // `fallback: false` est exactement ce que produit `dynamicParams = false` :
    // hors des paramètres énumérés, Next répond 404 au lieu de rendre.
    if (dynamic.fallback !== false) {
      problems.push(
        `${route} — se rendrait à la demande (fallback : ${JSON.stringify(dynamic.fallback)}). ` +
          `Ajoutez « export const dynamicParams = false ».`,
      )
    }
    continue
  }

  if (prerender.routes[route] === undefined) {
    problems.push(
      `${route} — n'est ni prégénérée, ni close par « dynamicParams = false » : ` +
        `elle serait rendue à chaque requête, sans « content/ » sur le serveur.`,
    )
  }
}

// --- 2. Régime --------------------------------------------------------------
const prerenderedPages = Object.entries(prerender.routes).filter(
  ([, entry]) => entry.routeType === 'page',
)

for (const [route, entry] of Object.entries(prerender.routes)) {
  // Refuser l'inconnu plutôt que n'accepter qu'une valeur nommée : si Next
  // renomme ou retire ce champ, ce contrôle doit le dire, pas devenir muet.
  if (entry.compute !== 'static') {
    problems.push(
      `${route} — prégénérée en régime « ${entry.compute ?? 'non déclaré'} », attendu « static ».`,
    )
  }
}

/**
 * Les pages **publiques** réellement servies — le fait. Les routes internes de
 * Next n'en sont pas, et la page introuvable non plus : elle est prégénérée,
 * mais c'est une destination de réécriture, jamais une adresse du site.
 */
const publicPages = new Set(
  prerenderedPages
    .map(([route]) => route)
    .filter((route) => !isInternal(route) && !isNotFoundPage(route)),
)

// --- 3. Sitemap -------------------------------------------------------------
if (appRoutes.includes('/sitemap.xml')) {
  const body = readFileSync(join(nextDir, 'server', 'app', 'sitemap.xml.body'), 'utf8')
  const inSitemap = new Set(
    [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1] as string).pathname),
  )

  for (const route of difference(publicPages, inSitemap)) {
    problems.push(
      `${route} — prégénérée mais absente du sitemap : elle ne sera pas indexée, ` +
        `et le contrôle E2E des « hreflang » ne la verra pas non plus.`,
    )
  }

  for (const path of difference(inSitemap, publicPages)) {
    problems.push(
      `${path} — annoncée au sitemap, mais aucune page n'est prégénérée à cette adresse : ` +
        `le sitemap promet à un moteur de recherche une URL qui répond 404.`,
    )
  }
}

// --- 4. Manifeste du proxy --------------------------------------------------
// Les deux sens sont des pannes silencieuses, et elles ne se ressemblent pas.
const served = new Set(await readServedPaths())

for (const path of difference(served, publicPages)) {
  problems.push(
    `${path} — annoncé servi par le proxy, mais aucune page n'est prégénérée à cette ` +
      `adresse : le proxy laisserait passer l'URL, et Next servirait sa 404 interne, ` +
      `hors du layout racine — donc sans « lang » (P4-07).`,
  )
}

for (const route of difference(publicPages, served)) {
  problems.push(
    `${route} — prégénérée mais absente du manifeste du proxy : celui-ci réécrirait ` +
      `une page réelle vers la page introuvable, en 404. Régénérez « src/routing/` +
      `route-manifest.ts » (« node scripts/generate-route-manifest.mts »).`,
  )
}

// --- Verdict ----------------------------------------------------------------
// Un gate qui n'inspecte rien sort en 0 et ne prouve rien : c'est le mode de
// panne rencontré en Phase 2 (`phase-2-log.md` §10.5), rendu bloquant depuis.
if (pageRoutes.length === 0) {
  console.error(
    `✗ Aucune route applicative trouvée dans ${nextDir}/app-path-routes-manifest.json.\n` +
      `  Un contrôle qui ne trouve rien ne vérifie rien.`,
  )
  process.exit(1)
}

if (problems.length > 0) {
  console.error(`\n✗ Rendu statique — ${problems.length} problème(s) :\n`)
  for (const problem of problems.sort()) console.error(`  ${problem}`)
  console.error(
    `\nLe build est interrompu volontairement : « content/ » n'est pas dans l'image de\n` +
      `production, donc une route rendue à la demande échouerait chez le visiteur.\n`,
  )
  process.exit(1)
}

console.log(
  `✓ Rendu statique — ${pageRoutes.length} route(s) applicative(s), ` +
    `${prerenderedPages.length} page(s) prégénérée(s), aucune à la demande, ` +
    `${publicPages.size} page(s) publique(s) au sitemap comme au manifeste du proxy.`,
)
