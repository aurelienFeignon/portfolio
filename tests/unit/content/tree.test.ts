/**
 * P2-07 — ce que `content/` contient et que personne ne lira.
 *
 * La règle vit dans la couche, pas dans le gate : tout consommateur peut donc
 * l'appliquer, et elle n'est écrite qu'une fois.
 */
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { inspectContentTree } from '@/content/tree'

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'content')

const inspect = (...segments: string[]) => inspectContentTree(join(FIXTURES, ...segments))

describe('inspection de l’arborescence', () => {
  it('ne signale rien sur une arborescence conforme', async () => {
    // La fixture porte un `README.md` à sa racine, comme `content/` : un fichier
    // posé là documente le dossier et n'a pas à ressembler à une locale.
    const report = await inspect('valid')

    expect(report.rootExists).toBe(true)
    expect(report.unexpected).toEqual([])
  })

  it('signale une racine introuvable sans rien inventer d’autre', async () => {
    const report = await inspect('inexistante')

    expect(report.rootExists).toBe(false)
    expect(report.unexpected).toEqual([])
  })

  it('signale un dossier de locale inconnu', async () => {
    const [problem] = (await inspect('invalid', 'unknown-locale')).unexpected

    expect(problem?.path).toContain(join('unknown-locale', 'de'))
    expect(problem?.reason).toContain('locale inattendu')
  })

  it('signale un type de contenu mal orthographié', async () => {
    const [problem] = (await inspect('invalid', 'mistyped-type')).unexpected

    expect(problem?.path).toContain(join('fr', 'skill'))
    expect(problem?.reason).toContain('entrée inattendue')
  })

  it('signale un fichier que le chargeur n’ouvrira pas', async () => {
    const [problem] = (await inspect('invalid', 'stray-file')).unexpected

    expect(problem?.path).toContain('brouillon.txt')
    expect(problem?.reason).toContain('ne lira pas cette entrée')
  })

  it('ne signale pas un fichier posé à la racine, qui documente le dossier', async () => {
    // `content/README.md` n'est pas du contenu et n'a pas à ressembler à une
    // locale : c'est le seul endroit où un fichier est légitime.
    const report = await inspect('other-extensions')

    expect(report.unexpected.map((entry) => entry.path)).toEqual([
      join(FIXTURES, 'other-extensions', 'fr', 'skills', 'notes.txt'),
    ])
  })

  it('ne signale pas un type absent : une locale peut ne pas tout traduire', async () => {
    // C'est la condition du repli de R-07 : `en/experiences` n'existe pas, et
    // ce n'est pas une faute.
    const report = await inspect('valid')

    expect(report.unexpected).toEqual([])
  })
})
