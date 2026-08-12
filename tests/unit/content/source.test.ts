/**
 * P2-03 — lecture du contenu sur le système de fichiers.
 *
 * Aucune de ces assertions ne touche `content/` : elles lisent
 * `tests/fixtures/content/`. C'est un critère de sortie de la phase — une suite
 * qui casse parce qu'un projet a été réécrit est une suite mal construite.
 */
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ContentError } from '@/content/errors'
import { createContentSource, defaultContentRoot } from '@/content/source'

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'content')

const valid = () => createContentSource(join(FIXTURES, 'valid'))
const broken = (name: string) => createContentSource(join(FIXTURES, 'invalid', name))

describe('lecture d’un dossier de contenu', () => {
  it('lit les fichiers `.md` et `.mdx` d’un même dossier', async () => {
    const files = await valid().read('fr', 'projects')

    expect(files.map((file) => file.slug)).toEqual(['augure', 'portfolio'])
  })

  it('tire le slug du nom du fichier, pas du frontmatter', async () => {
    const [augure] = await valid().read('fr', 'projects')

    expect(augure?.slug).toBe('augure')
    expect(augure?.file).toBe(join('content', 'fr', 'projects', 'augure.mdx'))
  })

  it('sépare le frontmatter du corps', async () => {
    const [augure] = await valid().read('fr', 'projects')

    expect(augure?.frontmatter['title']).toBe('Augure')
    expect(augure?.body).toContain('Le corps du projet')
  })

  it('rend le contenu de la locale demandée, et d’elle seule', async () => {
    const [french] = await valid().read('fr', 'projects')
    const [english] = await valid().read('en', 'projects')

    expect(french?.frontmatter['summary']).toContain('gestion documentaire')
    expect(english?.frontmatter['summary']).toContain('document management')
  })

  it('rend une liste vide quand ce type n’existe pas dans cette locale', async () => {
    await expect(valid().read('en', 'experiences')).resolves.toEqual([])
  })

  it('échoue explicitement quand la racine du contenu est introuvable', async () => {
    const source = createContentSource(join(FIXTURES, 'inexistant'))

    await expect(source.read('fr', 'projects')).rejects.toThrow(/racine du contenu introuvable/)
  })

  it('ignore les fichiers qui ne sont ni `.md` ni `.mdx`', async () => {
    const files = await valid().read('fr', 'skills')

    expect(files.map((file) => file.slug)).toEqual(['postgresql', 'typescript'])
  })

  it('laisse remonter une panne du système de fichiers qui n’est pas une absence', async () => {
    // Une racine qui désigne un fichier : `readdir` échoue en ENOTDIR, ce qui
    // n'est pas « ce contenu n'existe pas » et ne doit donc pas devenir une
    // liste vide.
    const source = createContentSource(join(FIXTURES, 'valid', 'fr', 'skills', 'typescript.md'))

    await expect(source.read('fr', 'projects')).rejects.toThrow(/ENOTDIR/)
  })

  it('vise `content/` à la racine du dépôt par défaut', () => {
    expect(defaultContentRoot()).toBe(join(process.cwd(), 'content'))
  })
})

describe('rejets à la lecture', () => {
  it('rejette un fichier sans frontmatter, en le nommant', async () => {
    await expect(broken('no-frontmatter').read('fr', 'projects')).rejects.toThrow(ContentError)
    await expect(broken('no-frontmatter').read('fr', 'projects')).rejects.toThrow(
      /projects.augure\.md/,
    )
  })

  it('rejette un frontmatter jamais refermé', async () => {
    await expect(broken('unterminated').read('fr', 'projects')).rejects.toThrow(/jamais refermé/)
  })

  it('rejette un YAML illisible', async () => {
    await expect(broken('broken-yaml').read('fr', 'projects')).rejects.toThrow(/YAML illisible/)
  })

  it('rejette un frontmatter qui n’est pas une table de champs', async () => {
    await expect(broken('list-frontmatter').read('fr', 'projects')).rejects.toThrow(
      /table de champs/,
    )
  })

  it('rejette deux fichiers qui viseraient la même URL', async () => {
    await expect(broken('duplicate-slug').read('fr', 'projects')).rejects.toThrow(
      /même slug « augure »/,
    )
  })
})

describe('mémoïsation', () => {
  it('ne relit le disque qu’une fois par locale et par type', async () => {
    const source = valid()
    const first = source.read('fr', 'projects')
    const second = source.read('fr', 'projects')

    expect(second).toBe(first)
    await expect(second).resolves.toHaveLength(2)
  })

  it('ne mémorise pas un échec : la lecture est retentée', async () => {
    const source = broken('broken-yaml')

    const first = source.read('fr', 'projects')
    await expect(first).rejects.toThrow(ContentError)

    const second = source.read('fr', 'projects')
    await expect(second).rejects.toThrow(ContentError)
    // Une nouvelle promesse, donc une nouvelle lecture : l'échec n'a pas été
    // mis en cache.
    expect(second).not.toBe(first)
  })

  it('donne des caches indépendants à deux sources', async () => {
    const first = valid().read('fr', 'projects')
    const second = valid().read('fr', 'projects')

    expect(second).not.toBe(first)
    await Promise.all([first, second])
  })
})
