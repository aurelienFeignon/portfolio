/**
 * P6-02 — `scene-state.ts` ne tire pas `layout.ts`.
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
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const RACINE = process.cwd()
const SRC = join(RACINE, 'src')
const LAYOUT = join(SRC, 'scene/state/layout.ts')

/** Le fichier qu'un spécificateur LOCAL désigne, `null` pour un paquet. */
function resoudre(depuis: string, specificateur: string): string | null {
  let base: string
  if (specificateur.startsWith('@/')) base = join(SRC, specificateur.slice(2))
  else if (specificateur.startsWith('.')) base = resolve(dirname(depuis), specificateur)
  else return null

  const candidat = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(
    (chemin) => existsSync(chemin) && chemin.match(/\.tsx?$/),
  )
  // ⛔ Un import local introuvable est une erreur du banc, pas un module en moins :
  // l'ignorer ferait rétrécir le graphe en silence.
  if (candidat === undefined) throw new Error(`Import introuvable : ${specificateur} (${depuis})`)
  return candidat
}

/** Les imports de VALEUR d'un fichier — ce qu'un bundler embarque avec lui. */
function importsDeValeur(fichier: string): string[] {
  const source = ts.createSourceFile(fichier, readFileSync(fichier, 'utf8'), ts.ScriptTarget.Latest)
  const specificateurs: string[] = []

  for (const instruction of source.statements) {
    if (ts.isImportDeclaration(instruction) && !instruction.importClause?.isTypeOnly) {
      specificateurs.push((instruction.moduleSpecifier as ts.StringLiteral).text)
    }
    if (
      ts.isExportDeclaration(instruction) &&
      !instruction.isTypeOnly &&
      instruction.moduleSpecifier
    ) {
      specificateurs.push((instruction.moduleSpecifier as ts.StringLiteral).text)
    }
  }

  return specificateurs
    .map((specificateur) => resoudre(fichier, specificateur))
    .filter((chemin): chemin is string => chemin !== null)
}

/** Tout ce que le chargement de `depart` embarque, `depart` compris. */
function fermeture(depart: string): Set<string> {
  const vus = new Set<string>()
  const aVisiter = [depart]
  for (let fichier = aVisiter.pop(); fichier !== undefined; fichier = aVisiter.pop()) {
    if (vus.has(fichier)) continue
    vus.add(fichier)
    aVisiter.push(...importsDeValeur(fichier))
  }
  return vus
}

const enClair = (fichiers: Set<string>) => [...fichiers].map((f) => relative(RACINE, f)).sort()

describe('le graphe d’imports de `scene-state.ts` (P6-02)', () => {
  it('⭐ témoin : le parcours trouve `layout.ts` depuis `camera-target.ts`', () => {
    expect(fermeture(join(SRC, 'scene/state/camera-target.ts')).has(LAYOUT)).toBe(true)
  })

  it('⭐ témoin : le parcours suit bien les arêtes de `scene-state.ts`', () => {
    // Sans ce contrôle, un parcours qui ne lirait aucun import rendrait un
    // graphe réduit au fichier de départ — et donc, trivialement, sans `layout.ts`.
    expect(enClair(fermeture(join(SRC, 'scene/state/scene-state.ts')))).toContain(
      'src/routing/paths.ts',
    )
  })

  it('⛔ n’embarque pas `layout.ts`', () => {
    const graphe = fermeture(join(SRC, 'scene/state/scene-state.ts'))

    expect(graphe.has(LAYOUT), enClair(graphe).join('\n')).toBe(false)
  })
})
