/**
 * P2-07 — cohérence référentielle `technologies` ↔ `Skill.slug`.
 *
 * Le typage ne peut rien contre `["typscript"]` : la faute n'existe qu'entre
 * deux fichiers.
 */
import { describe, expect, it } from 'vitest'

import {
  describeUnknownExperience,
  describeUnknownTechnologies,
  findPrimaryConflict,
  findPrimaryDivergence,
  findUnknownExperiences,
  findUnknownTechnologies,
} from '@/content/integrity'

const KNOWN = new Set(['typescript', 'postgresql'])

const reference = (file: string, technologies: string[]) => ({ file, technologies })

describe('détection des références mortes', () => {
  it('ne signale rien quand toutes les technologies existent', () => {
    const problems = findUnknownTechnologies(
      [reference('content/fr/projects/augure.mdx', ['typescript', 'postgresql'])],
      KNOWN,
    )

    expect(problems).toEqual([])
  })

  it('signale une faute de frappe, en nommant le fichier', () => {
    const problems = findUnknownTechnologies(
      [reference('content/fr/projects/augure.mdx', ['typscript'])],
      KNOWN,
    )

    expect(problems).toEqual([{ file: 'content/fr/projects/augure.mdx', unknown: ['typscript'] }])
  })

  it('rend toutes les références mortes d’un même fichier', () => {
    const [problem] = findUnknownTechnologies(
      [reference('content/fr/projects/augure.mdx', ['typescript', 'rust', 'elixir'])],
      KNOWN,
    )

    expect(problem?.unknown).toEqual(['rust', 'elixir'])
  })

  it('rend tous les fichiers fautifs, pas seulement le premier', () => {
    const problems = findUnknownTechnologies(
      [
        reference('content/fr/projects/augure.mdx', ['rust']),
        reference('content/fr/experiences/evea.md', ['typescript']),
        reference('content/fr/projects/portfolio.md', ['elixir']),
      ],
      KNOWN,
    )

    expect(problems.map((problem) => problem.file)).toEqual([
      'content/fr/projects/augure.mdx',
      'content/fr/projects/portfolio.md',
    ])
  })

  it('ne connaît aucune technologie quand aucune compétence n’existe', () => {
    const problems = findUnknownTechnologies(
      [reference('content/en/projects/augure.mdx', ['typescript'])],
      new Set(),
    )

    expect(problems).toHaveLength(1)
  })
})

describe('message d’erreur', () => {
  it('accorde au singulier pour une seule référence morte', () => {
    const message = describeUnknownTechnologies({
      file: 'content/fr/projects/augure.mdx',
      unknown: ['typscript'],
    })

    expect(message).toContain('une technologie inconnue')
    expect(message).toContain('« typscript »')
  })

  it('accorde au pluriel pour plusieurs', () => {
    const message = describeUnknownTechnologies({
      file: 'content/fr/projects/augure.mdx',
      unknown: ['rust', 'elixir'],
    })

    expect(message).toContain('des technologies inconnues')
    expect(message).toContain('« rust », « elixir »')
  })
})

// La carte mère (docs/carte-mere.md §6) : un projet se branche sur le bus d'une
// expérience, et un seul tient le processeur central.
describe('rattachement à une expérience', () => {
  it('ne signale rien quand l’expérience existe', () => {
    expect(
      findUnknownExperiences([{ file: 'p.mdx', experience: 'evea' }], new Set(['evea'])),
    ).toEqual([])
  })

  it('signale une expérience inconnue, en nommant le fichier', () => {
    expect(
      findUnknownExperiences([{ file: 'p.mdx', experience: 'evae' }], new Set(['evea'])),
    ).toEqual([{ file: 'p.mdx', experience: 'evae' }])
  })

  it('rend tous les fichiers fautifs, pas seulement le premier', () => {
    const problems = findUnknownExperiences(
      [
        { file: 'a.mdx', experience: 'evae' },
        { file: 'b.mdx', experience: 'evea' },
        { file: 'c.mdx', experience: 'augur' },
      ],
      new Set(['evea']),
    )

    expect(problems.map((problem) => problem.file)).toEqual(['a.mdx', 'c.mdx'])
  })

  it('décrit la faute avec le slug cité', () => {
    expect(describeUnknownExperience({ file: 'p.mdx', experience: 'evae' })).toContain('« evae »')
  })
})

describe('projet principal', () => {
  it('accepte zéro ou un principal', () => {
    expect(findPrimaryConflict([])).toBeNull()
    expect(findPrimaryConflict(['a.mdx'])).toBeNull()
  })

  it('refuse deux principaux et les nomme tous', () => {
    const message = findPrimaryConflict(['a.mdx', 'b.mdx'])

    expect(message).toContain('a.mdx')
    expect(message).toContain('b.mdx')
  })
})

describe('projet principal d’une locale à l’autre', () => {
  const locale = (name: string, primaries: string[], slugs: string[]) => ({
    locale: name,
    primaries: new Set(primaries),
    projectSlugs: new Set(slugs),
  })

  it('accepte le même principal dans les deux locales', () => {
    expect(
      findPrimaryDivergence([locale('fr', ['a'], ['a', 'b']), locale('en', ['a'], ['a', 'b'])]),
    ).toEqual([])
  })

  it('accepte un principal absent de l’autre locale, qui n’a pas traduit la fiche', () => {
    expect(
      findPrimaryDivergence([locale('fr', ['a'], ['a', 'b']), locale('en', [], ['b'])]),
    ).toEqual([])
  })

  it('refuse un principal présent mais non principal dans l’autre locale', () => {
    expect(findPrimaryDivergence([locale('fr', ['a'], ['a']), locale('en', [], ['a'])])).toEqual([
      {
        locale: 'en',
        message: expect.stringContaining('« a » est principal en fr mais pas en en'),
      },
    ])
  })

  it('signale UNE fois deux locales qui désignent deux principaux différents', () => {
    // Corriger l'une des deux suffit : deux erreurs pointeraient deux corrections.
    const problems = findPrimaryDivergence([
      locale('fr', ['a'], ['a', 'b']),
      locale('en', ['b'], ['a', 'b']),
    ])

    expect(problems).toHaveLength(1)
    expect(problems[0]?.message).toContain('désignent deux principaux différents')
  })

  it('n’invente pas de divergence quand une locale a déjà deux principaux', () => {
    // Le conflit de cette locale est signalé à part ; « a » y EST principal.
    expect(
      findPrimaryDivergence([
        locale('fr', ['a', 'b'], ['a', 'b']),
        locale('en', ['a'], ['a', 'b']),
      ]),
    ).toEqual([])
  })
})
