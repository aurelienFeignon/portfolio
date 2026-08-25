/**
 * P5-09 — **aucun module `three` dans ce qui est chargé à la première visite.**
 *
 * C'est la promesse centrale d'ADR-0003, et `performance-budget.md` §4 la veut
 * gardée « dans le graphe de dépendances des chunks initiaux, plus fiable qu'un
 * simple contrôle de taille ». P5-04 l'avait **mesurée** une fois, à la main ;
 * ce fichier en fait un garde permanent.
 *
 * ⭐⭐ **Le graphe se lit dans les source maps, et elles existent par accident
 * heureux** : `productionBrowserSourceMaps` a été activé en P5-04 pour satisfaire
 * l'audit Lighthouse `valid-source-maps`, que le chunk 3D avait fait rougir. Le
 * correctif d'une tâche est devenu l'instrument d'une autre.
 *
 * ⛔⛔ **Trois pièges, tous mesurés le 2026-08-25 plutôt que supposés :**
 *
 * 1. **Le nom d'une map ne se déduit PAS de celui de son `.js`.** Turbopack les
 *    nomme séparément — `1x3c9u4au-lzc.js` pointe vers `01b4c-1byoj-u.js.map`.
 *    Chercher `<script>.map` à côté du script rend « aucune map » sur un dossier
 *    qui en contient quinze. Le lien se lit dans le fichier, `sourceMappingURL`.
 * 2. **La chaîne `node_modules/three/` est ABSENTE du code minifié**, y compris
 *    du chunk qui est fait de `three`. Ce repère-là, apparemment évident, rend un
 *    faux négatif sur la seule population où il devrait crier.
 * 3. **Tous les scripts n'ont pas de map** : le chunk de polyfills n'en a aucune.
 *    Un garde qui exigerait une map partout serait rouge en permanence ; un garde
 *    qui les ignorerait en silence serait aveugle sur 110 Ko. D'où le repli, et
 *    d'où le fait qu'il s'affiche.
 *
 * ⭐⭐⭐ **Et le témoin, qui est le cœur de ce garde.** « Zéro module three » ne
 * veut rien dire tant qu'on n'a pas montré que l'instrument sait en voir : une
 * absence et un instrument aveugle se lisent exactement pareil (P4-16). Le même
 * détecteur est donc passé sur **tous** les chunks produits ; il doit trouver la
 * scène quelque part. S'il ne la trouve nulle part, ce garde échoue **en
 * s'accusant lui-même**, au lieu de rendre un vert qui ne prouve rien.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import { NEXT_DIR, firstVisitScripts, onDisk } from './first-visit-scripts.mts'

const CHUNKS_DIR = join(NEXT_DIR, 'static', 'chunks')

/**
 * Un module de la scène 3D. `.pnpm` interpose son répertoire d'adressage
 * (`node_modules/.pnpm/three@0.185.1/node_modules/three/build/…`), d'où la
 * recherche du segment terminal plutôt que d'un préfixe.
 */
const MODULE_3D = /node_modules\/(three|@react-three)\//

/** Repli pour un script sans map : une classe que seul `three` définit. */
const REPLI_3D = /WebGLRenderer/

interface Analyse {
  readonly script: string
  /** Modules 3D trouvés dans le graphe, vide si aucun. */
  readonly modules: readonly string[]
  /** `true` quand le verdict vient du repli, faute de source map. */
  readonly parRepli: boolean
}

function analyser(chemin: string): Analyse {
  const code = readFileSync(chemin, 'utf8')
  const lien = /\/\/# sourceMappingURL=(\S+)\s*$/.exec(code)?.[1]
  const script = basename(chemin)

  // ⚠️ Une map ANNONCÉE mais absente n'est pas une map : sans ce contrôle, le
  // garde meurt sur un `ENOENT` de Node, qui ne dit ni quel script ni pourquoi.
  // On retombe sur le repli, qui s'affiche — un instrument dégradé se voit.
  const map = lien === undefined ? undefined : join(dirname(chemin), lien)
  if (map !== undefined && existsSync(map)) {
    const sources = (JSON.parse(readFileSync(map, 'utf8')) as { sources?: string[] }).sources ?? []
    return { script, modules: sources.filter((source) => MODULE_3D.test(source)), parRepli: false }
  }

  return { script, modules: REPLI_3D.test(code) ? ['(détecté sans map)'] : [], parRepli: true }
}

/* ------------------------------------------- 1. le témoin : l'instrument voit-il ? */

if (!existsSync(CHUNKS_DIR)) {
  console.error(
    `✗ ${CHUNKS_DIR} est absent : exécuter le build avant ce garde.\n` +
      `  (\`make bundle\` construit puis mesure ; ce script seul suppose un build fait.)`,
  )
  process.exit(1)
}

const tousLesChunks = readdirSync(CHUNKS_DIR)
  .filter((nom) => nom.endsWith('.js'))
  .map((nom) => analyser(join(CHUNKS_DIR, nom)))

const porteurs = tousLesChunks.filter((analyse) => analyse.modules.length > 0)

if (porteurs.length === 0) {
  console.error(
    `✗ Témoin absent : aucun des ${tousLesChunks.length} chunks produits ne porte de module 3D.\n` +
      `  Ce garde ne peut donc rien affirmer — il ne sait pas s'il regarde une scène\n` +
      `  absente ou s'il est devenu aveugle (source maps désactivées, renommage de\n` +
      `  paquet, changement de bundler). Corriger le détecteur avant de conclure.`,
  )
  process.exit(1)
}

console.log(`Témoin : le détecteur voit la scène dans ${porteurs.length} chunk(s) différé(s).`)
for (const porteur of porteurs) {
  console.log(`  ${porteur.script} — ${porteur.modules.length} module(s) 3D`)
}

/* ----------------------------- 2. la population qui doit être vide : première visite */

/*
 * ⭐ **Les scripts `nomodule` sont examinés eux aussi**, alors que le budget les
 * laisse dehors (vision.md §5.6, navigateurs hors périmètre). Un budget parle de
 * poids ; ADR-0003 parle de ce qui est chargé, et « chargé » ne dépend pas du
 * navigateur qui charge. C'est aussi la seule population de ce site sans source
 * map, donc celle où le repli se voit — et un angle mort qui s'affiche n'est
 * plus un angle mort.
 */
const premiereVisite = [
  ...new Set(firstVisitScripts().flatMap((route) => [...route.modern, ...route.legacy])),
]
const analyses = premiereVisite.map((src) => analyser(onDisk(src)))
const fautifs = analyses.filter((analyse) => analyse.modules.length > 0)

console.log(`\nPremière visite : ${analyses.length} script(s) distinct(s) examiné(s).`)

const sansMap = analyses.filter((analyse) => analyse.parRepli)
if (sansMap.length > 0) {
  // ⭐ Une limite d'instrument s'affiche, elle ne se tait pas : ces scripts-là
  // sont jugés sur une chaîne, pas sur leur graphe.
  console.log(
    `  ⚠ ${sansMap.length} sans source map, jugé(s) par repli : ` +
      sansMap.map((analyse) => analyse.script).join(', '),
  )
}

if (fautifs.length > 0) {
  console.error(
    `\n✗ Du code 3D est chargé à la PREMIÈRE VISITE, ce qu'ADR-0003 interdit :\n` +
      fautifs
        .map(
          (faute) =>
            `  ${faute.script}\n` + faute.modules.map((module) => `      ${module}`).join('\n'),
        )
        .join('\n') +
      `\n\n  La scène doit rester derrière son import dynamique (\`ssr: false\`, après idle).\n` +
      `  Un import statique de \`three\`, de \`@react-three/*\` ou d'un module qui en\n` +
      `  dépend depuis un composant du socle suffit à produire ceci.`,
  )
  process.exit(1)
}

console.log(`\n✓ Aucun module 3D dans le JavaScript de première visite.`)
