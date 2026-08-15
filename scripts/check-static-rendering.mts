/**
 * Aucune route ne doit pouvoir se rendre à la demande (P3-02).
 *
 * **Pourquoi c'est un gate et pas une revue.** `content/` n'est pas copié dans
 * l'image de production : la lecture des fichiers a lieu au build, toutes les
 * pages étant statiques. Une route qui se rendrait à la demande chercherait donc
 * un dossier absent — et elle échouerait **en production**, à la première visite
 * d'une URL non prégénérée, jamais au build. C'est la dette tracée en Phase 2
 * (`phase-2-log.md` §9.4), et la Phase 3 est le moment où elle devient réelle,
 * puisque les routes existent enfin.
 *
 * Un `export const dynamicParams = false` oublié sur une route future ne
 * produirait aucune erreur visible : le site fonctionnerait, jusqu'à ce qu'un
 * visiteur demande `/fr/projects/nimporte-quoi`. Ce script est ce qui rend
 * l'oubli impossible.
 *
 * **Ce qu'il lit.** Deux manifestes écrits par `next build` :
 *   - `app-path-routes-manifest.json` — toutes les routes de l'App Router ;
 *   - `prerender-manifest.json` — ce qui a été réellement prégénéré, et sous
 *     quel régime.
 *
 * Il est branché sur `pnpm build`, donc il tourne aussi bien dans la CI que dans
 * la construction de l'image. Comme le gate de contenu, son code de sortie est
 * celui du build.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const NEXT_DIR = '.next'

interface PrerenderManifest {
  readonly routes: Record<string, { readonly compute?: string }>
  readonly dynamicRoutes: Record<string, { readonly fallback: unknown }>
}

/**
 * Les routes internes de Next (`/_not-found`, `/_global-error`) ne lisent aucun
 * contenu et n'ont pas de `generateStaticParams` : les exiger prégénérées
 * échouerait sur une propriété qui n'a pas de sens pour elles.
 */
function isInternal(route: string): boolean {
  return route.startsWith('/_')
}

function read<T>(name: string): T {
  const path = join(NEXT_DIR, name)
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
  .filter((route) => !isInternal(route))
  .sort()

const prerender = read<PrerenderManifest>('prerender-manifest.json')

const problems: string[] = []

for (const route of appRoutes) {
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

for (const [route, entry] of Object.entries(prerender.routes)) {
  if (entry.compute !== undefined && entry.compute !== 'static') {
    problems.push(`${route} — prégénérée mais en régime « ${entry.compute} », pas « static ».`)
  }
}

// Un gate qui n'inspecte rien sort en 0 et ne prouve rien : c'est le mode de
// panne rencontré en Phase 2 (`phase-2-log.md` §10.5), rendu bloquant depuis.
if (appRoutes.length === 0) {
  console.error(
    `✗ Aucune route applicative trouvée dans ${NEXT_DIR}/app-path-routes-manifest.json.\n` +
      `  Un contrôle qui ne trouve rien ne vérifie rien.`,
  )
  process.exit(1)
}

if (problems.length > 0) {
  console.error(`\n✗ Rendu à la demande — ${problems.length} route(s) :\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  console.error(
    `\nLe build est interrompu volontairement : « content/ » n'est pas dans l'image de\n` +
      `production, donc une route rendue à la demande échouerait chez le visiteur.\n`,
  )
  process.exit(1)
}

console.log(
  `✓ Rendu statique — ${appRoutes.length} route(s) applicative(s), ` +
    `${Object.keys(prerender.routes).length} page(s) prégénérée(s), aucune à la demande.`,
)
