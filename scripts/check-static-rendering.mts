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
 * **Trois contrôles, et aucun ne se contente de « j'ai vu au moins une chose ».**
 *
 * 1. *Rendu* — chaque route applicative est prégénérée, ou close par
 *    `dynamicParams = false`.
 * 2. *Régime* — chaque page prégénérée l'est en `static`. Un régime **inconnu**
 *    est refusé, pas ignoré : c'est ainsi qu'un ISR ou un PPR introduit par une
 *    montée de version se signale au lieu de passer.
 * 3. *Sitemap* — chaque page publique prégénérée figure au sitemap. Sans lui, le
 *    jour où une section gagne des pages de détail sans entrer dans
 *    `SECTIONS_WITH_DETAIL`, elles sont absentes de l'index **et** invisibles au
 *    test E2E de R-07, qui ne parcourt que les URL du sitemap. Les deux trous se
 *    composent, et la panne est celle que R-07 décrit.
 *
 * La racine est un **argument**, comme pour `scripts/check-content.mts` : c'est
 * ce qui rend le gate exécutable contre des manifestes de fixture, donc
 * testable. Un gate qui protège toute la production ne peut pas n'être vérifié
 * que par une observation manuelle.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const nextDir = process.argv[2] ?? '.next'

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

// --- 3. Sitemap -------------------------------------------------------------
if (appRoutes.includes('/sitemap.xml')) {
  const body = readFileSync(join(nextDir, 'server', 'app', 'sitemap.xml.body'), 'utf8')
  const inSitemap = new Set(
    [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1] as string).pathname),
  )

  for (const [route] of prerenderedPages) {
    if (!isInternal(route) && !inSitemap.has(route)) {
      problems.push(
        `${route} — prégénérée mais absente du sitemap : elle ne sera pas indexée, ` +
          `et le contrôle E2E des « hreflang » ne la verra pas non plus.`,
      )
    }
  }
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
    `${prerenderedPages.length} page(s) prégénérée(s), aucune à la demande, toutes au sitemap.`,
)
