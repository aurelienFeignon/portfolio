/**
 * P2-03 — l'erreur de la couche Content.
 */
import { describe, expect, it } from 'vitest'

import { ContentError, messageOf } from '@/content/errors'

describe('ContentError', () => {
  it('nomme le fichier fautif dans le message', () => {
    const error = new ContentError('content/fr/projects/augure.mdx', 'frontmatter absent')

    expect(error.message).toBe('content/fr/projects/augure.mdx — frontmatter absent')
    expect(error.file).toBe('content/fr/projects/augure.mdx')
    expect(error.name).toBe('ContentError')
  })

  it('conserve la cause d’origine', () => {
    const cause = new Error('YAML illisible')
    const error = new ContentError('content/fr/skills/typescript.md', 'échec', { cause })

    expect(error.cause).toBe(cause)
  })
})

describe('messageOf', () => {
  it('prend le message d’une erreur', () => {
    expect(messageOf(new Error('quelque chose'))).toBe('quelque chose')
  })

  it.each([
    ['une chaîne levée telle quelle', 'panne', 'panne'],
    ['un objet sans message', { code: 42 }, '[object Object]'],
    ['une valeur absente', undefined, 'undefined'],
  ])('reste lisible pour %s', (_label, cause, expected) => {
    expect(messageOf(cause)).toBe(expected)
  })
})
