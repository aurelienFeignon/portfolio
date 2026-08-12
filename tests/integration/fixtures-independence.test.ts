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

import { describe, expect, it } from 'vitest'

const TESTS = join(process.cwd(), 'tests')

async function testSources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return testSources(path)
      return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [path] : []
    }),
  )
  return files.flat()
}

describe('indépendance vis-à-vis du contenu réel', () => {
  it('aucun test n’utilise le dépôt de l’application', async () => {
    const sources = await testSources(TESTS)
    const offenders: string[] = []

    for (const source of sources) {
      const code = await readFile(source, 'utf8')
      // `contentRepository` est l'instance branchée sur `content/`. Les tests
      // construisent la leur avec `createContentRepository`, sur des fixtures.
      if (/\bcontentRepository\b/.test(code) && !source.endsWith('fixtures-independence.test.ts')) {
        offenders.push(source)
      }
    }

    expect(offenders).toEqual([])
  })

  it('aucun test ne pointe la racine de contenu par défaut', async () => {
    const sources = await testSources(TESTS)
    const offenders: string[] = []

    for (const source of sources) {
      const code = await readFile(source, 'utf8')
      // Constater la valeur de `defaultContentRoot()` est permis ; la donner à
      // une source, c'est lire le contenu réel.
      if (/createContentSource\(\s*defaultContentRoot\(\)/.test(code)) offenders.push(source)
    }

    expect(offenders).toEqual([])
  })

  it('trouve bien les fichiers de test qu’il prétend inspecter', async () => {
    const sources = await testSources(TESTS)

    // Sans ce contrôle, un parcours qui ne trouve rien rendrait les deux
    // assertions précédentes vertes pour la pire des raisons.
    expect(sources.length).toBeGreaterThan(10)
    expect(sources.some((source) => source.endsWith('repository.test.ts'))).toBe(true)
  })
})
