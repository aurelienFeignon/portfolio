/**
 * Mesure du JavaScript de première visite et application des seuils (P1-12).
 *
 * **Ce que l'on mesure, et pourquoi comme ça.** La première version lisait
 * `rootMainFiles` dans le manifeste de build. C'était faux : ce champ ne contient
 * que le socle du framework, et pas les chunks propres à une route. Vérifié en
 * ajoutant un composant client au layout racine — la mesure n'avait pas bougé
 * d'un octet. Un gate incapable d'échouer.
 *
 * On lit donc les scripts réellement référencés par le HTML prérendu de chaque
 * route : c'est exactement ce qu'un navigateur télécharge. Les tailles sont en
 * transfert gzip, conformément à `performance-budget.md` §4.
 *
 * Les scripts marqués `nomodule` ne sont servis qu'aux navigateurs anciens : ils
 * sont mesurés et affichés, mais hors budget (vision.md §5.6).
 */
import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const NEXT_DIR = '.next'
const APP_DIR = join(NEXT_DIR, 'server', 'app')

/**
 * Socle du framework mesuré le 2026-08-11 (Next 16.3.0 + React 19.2.8) sur une
 * application **sans aucun composant client** : plancher incompressible, pas une
 * consommation du projet.
 *
 * Le budget initial (95 Ko cible / 120 Ko bloquant) était **inférieur à ce
 * plancher**, donc inatteignable quel que soit le code écrit. Rebasé sur la
 * mesure — révision documentée dans `performance-budget.md` §4 et
 * `phase-1-log.md` §4 septies.
 *
 * Ce qui est budgété ici est la **part applicative** : ce que le projet ajoute
 * au-dessus du socle. C'est la seule quantité sur laquelle le code a prise.
 */
const BASELINE_KB = 126
const SHARED_APP_BLOCKING_KB = 20
const SHARED_BLOCKING_KB = BASELINE_KB + SHARED_APP_BLOCKING_KB
const SHARED_TARGET_KB = BASELINE_KB + 10

/** `performance-budget.md` §4 — JS propre à une page, hors socle partagé. */
const ROUTE_TARGET_KB = 25
const ROUTE_BLOCKING_KB = 40

function gzipKilobytes(staticPath: string): number {
  const relative = staticPath.replace(/^\/_next\//, '')
  return gzipSync(readFileSync(join(NEXT_DIR, relative)), { level: 9 }).byteLength / 1024
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
 * 4 pages sur 20 étaient mesurées — `/fr` et `/en`, jamais `/fr/projects` ni
 * `/fr/projects/augure`. Une page de détail qui aurait embarqué du JavaScript
 * client serait passée sous le budget sans être vue.
 *
 * Constaté en lisant la sortie du gate (« Socle partagé par les 4 routes ») avec
 * 20 pages au build. Le mode de panne est celui de tous les gates de ce dépôt :
 * il passait au vert en mesurant moins que ce qui existe.
 */
const routes = readdirSync(APP_DIR, { recursive: true })
  .map(String)
  .filter((name) => name.endsWith('.html'))
  .map((name) => ({
    name: name === 'index.html' ? '/' : `/${name.replace(/\.html$/, '')}`,
    ...scriptsOf(readFileSync(join(APP_DIR, name), 'utf8')),
  }))

if (routes.length === 0) {
  console.error('Aucune route prérendue trouvée : exécuter le build avant la mesure.')
  process.exit(1)
}

// Socle partagé = scripts présents sur TOUTES les routes. Déduit des pages
// réelles, jamais d'un champ de manifeste dont le sens peut changer.
const shared = routes[0]!.modern.filter((src) => routes.every((r) => r.modern.includes(src)))
const sharedKb = shared.reduce((sum, src) => sum + gzipKilobytes(src), 0)
const legacyKb = routes[0]!.legacy.reduce((sum, src) => sum + gzipKilobytes(src), 0)

console.log(`Socle partagé par les ${routes.length} routes prérendues :`)
for (const src of [...shared].sort((a, b) => gzipKilobytes(b) - gzipKilobytes(a))) {
  console.log(`  ${gzipKilobytes(src).toFixed(1).padStart(7)} Ko  ${src.replace('/_next/', '')}`)
}
console.log(`  ${legacyKb.toFixed(1).padStart(7)} Ko  (nomodule, hors budget)`)

const appShare = sharedKb - BASELINE_KB
console.log(`\n  Socle partagé   : ${sharedKb.toFixed(1)} Ko`)
console.log(`    framework     : ${BASELINE_KB.toFixed(1)} Ko (mesuré, incompressible ici)`)
console.log(`    applicatif    : ${appShare >= 0 ? '+' : ''}${appShare.toFixed(1)} Ko`)
console.log(`    seuils        : cible ${SHARED_TARGET_KB} Ko · bloquant ${SHARED_BLOCKING_KB} Ko`)

console.log(`\n  JS propre à chaque route (hors socle) :`)
const routeOverruns: string[] = []
for (const route of routes) {
  const own = route.modern.filter((src) => !shared.includes(src))
  const kb = own.reduce((sum, src) => sum + gzipKilobytes(src), 0)
  const verdict = kb > ROUTE_BLOCKING_KB ? '✗' : kb > ROUTE_TARGET_KB ? '⚠' : '✓'
  console.log(`    ${verdict} ${kb.toFixed(1).padStart(6)} Ko  ${route.name}`)
  if (kb > ROUTE_BLOCKING_KB) routeOverruns.push(`${route.name} (${kb.toFixed(1)} Ko)`)
}
console.log(`    seuils : cible ${ROUTE_TARGET_KB} Ko · bloquant ${ROUTE_BLOCKING_KB} Ko`)

let failed = false

if (sharedKb > SHARED_BLOCKING_KB) {
  console.error(
    `\n✗ Socle partagé : ${sharedKb.toFixed(1)} Ko > ${SHARED_BLOCKING_KB} Ko.\n` +
      `  Du JavaScript client s'est ajouté au bundle chargé par TOUTES les routes.\n` +
      `  Le corriger, ce n'est pas relever ce seuil — c'est sortir ce code du socle\n` +
      `  (performance-budget.md §9).`,
  )
  failed = true
}

if (routeOverruns.length > 0) {
  console.error(`\n✗ Routes au-dessus du seuil bloquant : ${routeOverruns.join(', ')}.`)
  failed = true
}

if (failed) process.exit(1)

if (sharedKb > SHARED_TARGET_KB) {
  console.warn(`\n⚠ Socle au-dessus de la cible, sous le seuil bloquant. À surveiller.`)
} else {
  console.log(`\n✓ Tous les budgets de bundle sont tenus.`)
}

if (sharedKb < BASELINE_KB - 5) {
  console.warn(
    `\n⚠ Socle mesuré (${sharedKb.toFixed(1)} Ko) nettement sous la référence (${BASELINE_KB} Ko) :\n` +
      `  remesurer et rebaser BASELINE_KB, sinon la marge applicative grandit en silence.`,
  )
}
