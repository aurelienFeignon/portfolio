/**
 * P2-07 — cohérence référentielle `technologies` ↔ `Skill.slug`.
 *
 * Le typage ne peut rien contre `["typscript"]` : la faute n'existe qu'entre
 * deux fichiers.
 */
import { describe, expect, it } from 'vitest'

import { describeUnknownTechnologies, findUnknownTechnologies } from '@/content/integrity'

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
