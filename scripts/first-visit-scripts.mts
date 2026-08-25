/**
 * Ce qu'un navigateur télécharge à la **première visite**, route par route.
 *
 * ⭐ **Extrait de `check-bundle-budget.mts` en P5-09, et non recopié.** Deux
 * gardes lisent désormais cette liste — le budget (combien ça pèse) et
 * l'isolation de la scène (ce qu'il y a dedans). Les laisser énumérer chacun de
 * leur côté aurait produit deux dérivées d'une même vérité : quand elles
 * divergent, le message accuse celle qui n'a pas tort (`phase-4-log.md` §14.3).
 *
 * **Ce que l'on lit, et pourquoi comme ça.** Pas `rootMainFiles` du manifeste de
 * build — ce champ ne porte que le socle du framework, jamais les chunks propres
 * à une route, et un gate qui s'y fiait n'avait pas bougé d'un octet quand on
 * ajoutait un composant client au layout racine. On lit les scripts réellement
 * référencés par le HTML prérendu : c'est exactement ce qu'un navigateur
 * demande.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const NEXT_DIR = '.next'
const APP_DIR = join(NEXT_DIR, 'server', 'app')

export interface RouteScripts {
  readonly name: string
  /** Scripts servis aux navigateurs modernes — ceux qui portent le budget. */
  readonly modern: readonly string[]
  /** Scripts `nomodule` : servis aux navigateurs hors périmètre (vision.md §5.6). */
  readonly legacy: readonly string[]
}

/** Scripts d'une page, séparés selon qu'ils ciblent ou non les navigateurs modernes. */
function scriptsOf(html: string): { modern: string[]; legacy: string[] } {
  const modern = new Set<string>()
  const legacy = new Set<string>()

  for (const tag of html.match(/<script[^>]*>/g) ?? []) {
    const src = /src="([^"]+\.js)"/.exec(tag)?.[1]
    if (src === undefined || !src.startsWith('/_next/')) continue
    // React émet l'attribut en casse mixte (`noModule=""`) : une comparaison
    // sensible à la casse compte les polyfills comme du JS moderne et gonfle le
    // socle de 38 Ko. Constaté en P1-12.
    ;(/nomodule/i.test(tag) ? legacy : modern).add(src)
  }
  return { modern: [...modern], legacy: [...legacy] }
}

/**
 * ⚠️ **Le parcours est récursif, et il ne l'était pas.** Jusqu'en Phase 3, le
 * site n'avait qu'une route : `readdirSync(APP_DIR)` sans option la trouvait, et
 * rien ne signalait qu'il ne descendait pas. À l'arrivée du segment `[locale]`,
 * 4 pages sur 20 étaient mesurées — jamais `/fr/projects/augure`. Une page de
 * détail qui aurait embarqué du JavaScript client serait passée sous le budget
 * sans être vue.
 *
 * **Le compte est confronté à ce qui existe, et non à zéro.** La sentinelle
 * historique — « si je n'ai rien trouvé, j'échoue » — n'aurait pas vu le défaut
 * réellement rencontré : un sous-comptage **non nul**. La liste faisant autorité
 * est le manifeste de prérendu, où Next déclare une entrée `routeType: 'page'`
 * par page HTML produite.
 *
 * Sort du processus si la mesure ne couvre pas ce que Next a produit : un garde
 * qui mesure moins que ce qui existe passe au vert pour la mauvaise raison.
 */
export function firstVisitScripts(): RouteScripts[] {
  const routes = readdirSync(APP_DIR, { recursive: true })
    .map(String)
    .filter((name) => name.endsWith('.html'))
    .map((name) => ({
      name: name === 'index.html' ? '/' : `/${name.replace(/\.html$/, '')}`,
      ...scriptsOf(readFileSync(join(APP_DIR, name), 'utf8')),
    }))

  const prerendered = JSON.parse(
    readFileSync(join(NEXT_DIR, 'prerender-manifest.json'), 'utf8'),
  ) as { routes: Record<string, { routeType?: string }> }

  const expectedPages = Object.values(prerendered.routes).filter(
    (route) => route.routeType === 'page',
  ).length

  if (routes.length !== expectedPages) {
    console.error(
      `✗ ${routes.length} page(s) HTML mesurée(s) pour ${expectedPages} déclarée(s) par Next.\n` +
        `  Une page non mesurée peut embarquer du JavaScript client sans être vue.`,
    )
    process.exit(1)
  }

  if (routes.length === 0) {
    console.error('Aucune route prérendue trouvée : exécuter le build avant la mesure.')
    process.exit(1)
  }

  return routes
}

/** Chemin sur disque d'un script référencé par le HTML (`/_next/…`). */
export function onDisk(staticPath: string): string {
  return join(NEXT_DIR, staticPath.replace(/^\/_next\//, ''))
}
