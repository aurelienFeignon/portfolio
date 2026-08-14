/**
 * P2-04 — validation stricte.
 *
 * Ce qui est vérifié ici : le **rejet**, et la **qualité du message**. Un build
 * rouge dont on ne sait pas quel fichier corriger ne vaut guère mieux qu'un
 * build vert sur du contenu faux (CF-10).
 */
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ContentError } from '@/content/errors'
import { createContentLoader, validateFile } from '@/content/loader'
import { createContentSource, type ContentFile } from '@/content/source'
import { makeProjectFrontmatter } from '../../fixtures/builders/frontmatter'

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'content')

/**
 * Le type est fixé dans la signature, et pas seulement dans la valeur : c'est ce
 * qui fait rendre à `validateFile` un `Project`, et non l'union des trois
 * entités. La corrélation type → entité est vérifiée ici, à la compilation.
 */
function fileOf(
  frontmatter: Record<string, unknown>,
  slug = 'augure',
): ContentFile & { type: 'projects' } {
  return {
    locale: 'fr',
    type: 'projects',
    slug,
    file: `content/fr/projects/${slug}.mdx`,
    frontmatter,
    body: 'Le corps.',
  }
}

describe('validation d’un fichier', () => {
  it('rend une entité typée, corps compris', () => {
    const project = validateFile(fileOf(makeProjectFrontmatter()))

    expect(project.title).toBe('Augure')
    expect(project.body).toBe('Le corps.')
  })

  it('lève une ContentError qui nomme le fichier fautif', () => {
    const invalid = makeProjectFrontmatter({ type: 'client' })

    expect(() => validateFile(fileOf(invalid))).toThrow(ContentError)
    expect(() => validateFile(fileOf(invalid))).toThrow('content/fr/projects/augure.mdx')
  })

  it('rapporte tous les défauts d’un fichier, pas seulement le premier', () => {
    const invalid = makeProjectFrontmatter({ feature: true, summary: 'Court.', startedAt: 'hier' })

    try {
      validateFile(fileOf(invalid))
      expect.unreachable('la validation aurait dû échouer')
    } catch (error) {
      const { message } = error as ContentError
      expect(message).toContain('feature')
      expect(message).toContain('summary')
      expect(message).toContain('startedAt')
    }
  })

  it('nomme le champ fautif et la règle violée', () => {
    try {
      validateFile(fileOf(makeProjectFrontmatter({ technologies: [] })))
      expect.unreachable('la validation aurait dû échouer')
    } catch (error) {
      expect((error as ContentError).message).toContain('doit citer au moins une technologie')
    }
  })

  it('rejette un slug de frontmatter qui diverge du nom du fichier', () => {
    expect(() => validateFile(fileOf(makeProjectFrontmatter({ slug: 'augur' })))).toThrow(
      /annonce le slug « augur ».*impose « augure »/,
    )
  })

  it('valide chacun des trois types de contenu depuis les fixtures', async () => {
    const loader = createContentLoader(createContentSource(join(FIXTURES, 'valid')))

    await expect(loader.load('fr', 'projects')).resolves.toHaveLength(2)
    await expect(loader.load('fr', 'experiences')).resolves.toHaveLength(1)
    await expect(loader.load('fr', 'skills')).resolves.toHaveLength(2)
  })
})

describe('chargement d’un dossier', () => {
  const loader = (root: string) => createContentLoader(createContentSource(root))

  it('rend des entités validées', async () => {
    const projects = await loader(join(FIXTURES, 'valid')).load('fr', 'projects')

    expect(projects.map((project) => project.slug)).toEqual(['augure', 'portfolio'])
    expect(projects[0]?.featured).toBe(true)
    // Champ absent du fichier : le défaut sûr s'applique, il n'est pas inventé.
    expect(projects[1]?.featured).toBe(false)
  })

  it('interrompt le chargement dès qu’un fichier du dossier est invalide', async () => {
    await expect(
      loader(join(FIXTURES, 'invalid', 'unknown-key')).load('fr', 'projects'),
    ).rejects.toThrow(ContentError)
  })
})
