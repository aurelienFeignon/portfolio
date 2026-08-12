/**
 * P2-03 — découpage du frontmatter et lecture du YAML.
 *
 * Ces cas sont ceux qu'un auteur produit réellement : délimiteur oublié,
 * guillemet non refermé, fichier enregistré sous Windows.
 */
import { describe, expect, it } from 'vitest'

import { ContentError } from '@/content/errors'
import { parseFrontmatter, splitFrontmatter } from '@/content/frontmatter'

const FILE = 'content/fr/projects/augure.mdx'

describe('découpage du frontmatter', () => {
  it('sépare le frontmatter du corps', () => {
    const { yaml, body } = splitFrontmatter(FILE, '---\nslug: augure\n---\nDu corps.\n')

    expect(yaml).toBe('slug: augure')
    expect(body).toBe('Du corps.\n')
  })

  it('ne coupe pas le fichier sur une ligne de séparation du corps', () => {
    const { body } = splitFrontmatter(FILE, '---\nslug: augure\n---\nAvant.\n\n---\n\nAprès.\n')

    expect(body).toContain('Avant.')
    expect(body).toContain('Après.')
  })

  it('accepte un fichier aux fins de ligne Windows', () => {
    const { yaml, body } = splitFrontmatter(FILE, '---\r\nslug: augure\r\n---\r\nDu corps.\r\n')

    expect(yaml).toBe('slug: augure')
    expect(body).toBe('Du corps.\n')
  })

  it('accepte un fichier précédé d’une marque d’ordre des octets', () => {
    const { yaml } = splitFrontmatter(FILE, '﻿---\nslug: augure\n---\n')

    expect(yaml).toBe('slug: augure')
  })

  it('accepte un fichier sans corps', () => {
    expect(splitFrontmatter(FILE, '---\nslug: augure\n---\n').body).toBe('')
  })

  it('rejette un fichier sans frontmatter, en le nommant', () => {
    expect(() => splitFrontmatter(FILE, '# Un titre\n')).toThrow(ContentError)
    expect(() => splitFrontmatter(FILE, '# Un titre\n')).toThrow(FILE)
  })

  it('rejette un frontmatter jamais refermé', () => {
    expect(() => splitFrontmatter(FILE, '---\nslug: augure\n\nDu corps.\n')).toThrow(
      /jamais refermé/,
    )
  })

  it('rejette un délimiteur de fermeture collé à autre chose', () => {
    expect(() => splitFrontmatter(FILE, '---\nslug: augure\n----\nDu corps.\n')).toThrow(
      ContentError,
    )
  })
})

describe('lecture du frontmatter YAML', () => {
  it('rend les champs sous forme de table', () => {
    expect(parseFrontmatter(FILE, 'slug: augure\nlevel: 5')).toEqual({ slug: 'augure', level: 5 })
  })

  it('laisse une date en chaîne plutôt que d’en faire un objet Date', () => {
    const data = parseFrontmatter(FILE, 'startedAt: 2024-01-15')

    expect(data['startedAt']).toBe('2024-01-15')
  })

  it('laisse « yes » en chaîne plutôt que d’en faire un booléen', () => {
    expect(parseFrontmatter(FILE, 'answer: yes')['answer']).toBe('yes')
  })

  it('rejette un YAML illisible, en nommant le fichier', () => {
    expect(() => parseFrontmatter(FILE, 'title: "jamais refermé\n')).toThrow(ContentError)
    expect(() => parseFrontmatter(FILE, 'title: "jamais refermé\n')).toThrow(FILE)
  })

  it('rejette un frontmatter vide', () => {
    expect(() => parseFrontmatter(FILE, '')).toThrow(/table de champs/)
  })

  it('rejette un frontmatter qui est une liste', () => {
    expect(() => parseFrontmatter(FILE, '- typescript\n- postgresql')).toThrow(/table de champs/)
  })
})
