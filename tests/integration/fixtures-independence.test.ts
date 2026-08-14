/**
 * P2-09 — les tests ne lisent jamais le contenu réel.
 *
 * C'est un **critère de sortie** de la Phase 2, et il ne se vérifie pas en le
 * décidant : rien n'empêche un test futur d'appeler le dépôt de l'application,
 * puis de casser le jour où un projet est réécrit. Ce garde-fou-là est
 * permanent ; il complète la vérification faite une fois à la main, en
 * exécutant la suite complète avec `content/` mis de côté
 * (`phase-2-log.md` §14).
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

const TESTS = join(process.cwd(), 'tests')

/** Chargé une fois : les trois contrôles filtrent le même relevé. */
let sources: { path: string; code: string }[] = []

beforeAll(async () => {
  // `recursive` évite de réécrire une descente à la main — disponible depuis
  // Node 20.1, et `package.json#engines` exige 24.
  const paths = (await readdir(TESTS, { recursive: true })).filter(
    (path) => path.endsWith('.ts') || path.endsWith('.tsx'),
  )

  sources = await Promise.all(
    paths.map(async (path) => ({
      path: join(TESTS, path),
      code: await readFile(join(TESTS, path), 'utf8'),
    })),
  )
})

const SELF = 'fixtures-independence.test.ts'

describe('indépendance vis-à-vis du contenu réel', () => {
  const offenders = (pattern: RegExp) =>
    sources
      .filter(({ path, code }) => pattern.test(code) && !path.endsWith(SELF))
      .map(({ path }) => path)

  it('aucun test n’utilise le dépôt de l’application', () => {
    // `contentRepository` est l'instance branchée sur `content/`. Les tests
    // construisent la leur avec `createContentRepository`, sur des fixtures.
    expect(offenders(/\bcontentRepository\b/)).toEqual([])
  })

  it('aucun test ne pointe la racine de contenu par défaut', () => {
    // Constater la valeur de `defaultContentRoot()` est permis ; la donner à une
    // source, c'est lire le contenu réel.
    expect(offenders(/createContentSource\(\s*defaultContentRoot\(\)/)).toEqual([])
  })

  it('trouve bien les fichiers de test qu’il prétend inspecter', () => {
    // Sans ce contrôle, un parcours qui ne trouve rien rendrait les deux
    // assertions précédentes vertes pour la pire des raisons.
    expect(sources.length).toBeGreaterThan(10)
    expect(sources.some(({ path }) => path.endsWith('repository.test.ts'))).toBe(true)
  })
})
