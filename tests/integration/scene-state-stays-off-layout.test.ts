/**
 * P6-02 — `scene-state.ts` ne tire pas `layout.ts`. Depuis P8-14, le même
 * graphe garde aussi `scene/state/board/` (le plan de carte) hors du chemin de
 * première visite — dernier `describe`, avec son propre témoin. Le nom du
 * fichier est resté celui de P6-02.
 *
 * ⭐⭐ **La règle de découpage de `src/scene/state` n'était gardée par rien.**
 * `resolveSceneState` sera lue depuis le chunk de première visite (P6-07), et le
 * plan coté du bureau entier n'a pas à y entrer : *un module est indivisible du
 * point de vue d'un bundler* (P5-08). Mais `scripts/check-scene-isolation.mts`
 * ne cherche que `three` et `@react-three` — `layout.ts` n'importe ni l'un ni
 * l'autre, donc il traverserait ce garde sans un rouge. Et tant que P6-07 n'a pas
 * branché `resolveSceneState`, aucun chunk réel ne peut le montrer. Relevé en
 * revue de P6-02, où un critère d'acceptation l'affirmait sans rien derrière.
 *
 * Ce banc lit donc le **graphe d'imports de valeur**, depuis le source, avec
 * l'analyseur de TypeScript :
 *
 * - `import type …` est effacé à la compilation : ce n'est pas une arête ;
 * - ⛔ `import { type X } from …` **en est une** : sous `verbatimModuleSyntax`,
 *   il est émis comme `import {} from …`, donc le module est chargé quand même ;
 * - un `import()` dynamique n'en est pas une : il ouvre un chunk à part, hors
 *   de la première visite — c'est précisément la frontière que P5-04 emploie.
 *
 * ⭐⭐⭐ **Et il porte un témoin** : le même parcours, lancé depuis
 * `camera-target.ts`, doit trouver `layout.ts`. Sinon l'instrument est aveugle,
 * et l'absence qu'il rapporte ne vaut rien (P5-09).
 *
 * ⚠️ Il lit le SOURCE, pas le chunk. Ce que le build embarque réellement reste à
 * mesurer par `scripts/check-scene-isolation.mts`, qui ne cherche aujourd'hui que
 * `three` — l'étendre à `layout.ts` est à faire avec P6-07.
 */
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const RACINE = process.cwd()
const SRC = join(RACINE, 'src')
const LAYOUT = join(SRC, 'scene/state/layout.ts')
const BOARD = join(SRC, 'scene/state/board')

/**
 * ⭐ La résolution est celle du COMPILATEUR, avec le `tsconfig` du dépôt — alias
 * `@/`, extensions, `index` : rien n'est recopié ici, donc rien ne dérive.
 */
const { options } = ts.parseJsonConfigFileContent(
  ts.readConfigFile(join(RACINE, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  RACINE,
)

/** Le fichier TS que désigne un import local ; `null` pour un paquet ou une feuille de style. */
function resoudre(depuis: string, specificateur: string): string | null {
  const resolu = ts.resolveModuleName(specificateur, depuis, options, ts.sys).resolvedModule
  if (resolu === undefined) {
    // ⛔ Un import local introuvable est une erreur du banc, pas un module en
    // moins : l'ignorer ferait rétrécir le graphe en silence. Les feuilles de
    // style (`*.module.css`) n'ont pas de module TS et ne tirent rien.
    if (/\.css$/.test(specificateur) || !/^(\.|@\/)/.test(specificateur)) return null
    throw new Error(`Import introuvable : ${specificateur} (${depuis})`)
  }
  return resolu.isExternalLibraryImport ? null : resolu.resolvedFileName
}

/** Les imports de VALEUR d'un fichier — ce qu'un bundler embarque avec lui. */
function importsDeValeur(fichier: string): string[] {
  const source = ts.createSourceFile(fichier, readFileSync(fichier, 'utf8'), ts.ScriptTarget.Latest)

  return source.statements.flatMap((instruction) => {
    const deValeur =
      (ts.isImportDeclaration(instruction) && !instruction.importClause?.isTypeOnly) ||
      (ts.isExportDeclaration(instruction) && !instruction.isTypeOnly)
    if (
      !deValeur ||
      !instruction.moduleSpecifier ||
      !ts.isStringLiteral(instruction.moduleSpecifier)
    ) {
      return []
    }
    const chemin = resoudre(fichier, instruction.moduleSpecifier.text)
    return chemin === null ? [] : [chemin]
  })
}

/** Tout ce que le chargement de `depart` embarque, `depart` compris. */
function fermeture(depart: string): Set<string> {
  const vus = new Set<string>()
  const aVisiter = [depart]
  while (aVisiter.length > 0) {
    const fichier = aVisiter.pop() as string
    if (vus.has(fichier)) continue
    vus.add(fichier)
    aVisiter.push(...importsDeValeur(fichier))
  }
  return vus
}

const enClair = (fichiers: Set<string>) => [...fichiers].map((f) => relative(RACINE, f)).sort()

/**
 * Les racines du chemin de première visite côté scène. `scene-mount.tsx` est
 * celle qui existe aujourd'hui (montée par le layout de chaque page) ;
 * `scene-state.ts` est celle que P6-07 y amènera.
 */
const RACINES = ['scene/components/scene-mount.tsx', 'scene/state/scene-state.ts']

describe('le chemin de première visite n’embarque pas `layout.ts` (P6-02)', () => {
  it('⭐ témoin : le parcours trouve `layout.ts` depuis `camera-target.ts`', () => {
    expect(fermeture(join(SRC, 'scene/state/camera-target.ts')).has(LAYOUT)).toBe(true)
  })

  it.each(RACINES)('%s', (racine) => {
    const graphe = fermeture(join(SRC, racine))

    // ⭐ Témoin : le parcours a bien suivi des arêtes. Sans ce contrôle, un
    // parcours qui ne lirait aucun import rendrait un graphe réduit au fichier de
    // départ — et donc, trivialement, sans `layout.ts`.
    expect(graphe.size, enClair(graphe).join('\n')).toBeGreaterThan(1)
    expect(graphe.has(LAYOUT), enClair(graphe).join('\n')).toBe(false)
  })
})

/**
 * P8-14 — le plan de carte (`scene/state/board/`) est un module de la carte
 * mère, chargé par P8-15 depuis un chunk à part : *rien* sur le chemin de
 * première visite n'en importe une valeur.
 */
describe('le chemin de première visite n’embarque rien de `board/` (P8-14)', () => {
  it('⭐ témoin : le parcours trouve `board/timeline.ts` depuis `board/plan.ts`', () => {
    expect(fermeture(join(BOARD, 'plan.ts')).has(join(BOARD, 'timeline.ts'))).toBe(true)
  })

  it.each(RACINES)('%s', (racine) => {
    const graphe = fermeture(join(SRC, racine))
    const intrus = enClair(graphe).filter((f) => f.startsWith('src/scene/state/board/'))

    expect(graphe.size).toBeGreaterThan(1)
    expect(intrus).toEqual([])
  })
})
