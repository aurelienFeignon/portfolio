/**
 * P2-08 — inspection statique d'un corps MDX.
 *
 * Ces fonctions sont pures et sans JSX : elles se testent sur des arbres
 * littéraux, exactement comme le gate de contenu les rencontre.
 */
import { describe, expect, it } from 'vitest'

import {
  collectComponentNames,
  describeIfForbidden,
  describeUnreadableBody,
} from '@/ui/mdx/inspect'
import { MDX_COMPONENT_NAMES } from '@/ui/mdx/whitelist'

/** Le greffon remark rend le visiteur ; on l'appelle comme unified le ferait. */
const walkOf = (into: Set<string>) => collectComponentNames(into)()

describe('relevé des composants appelés', () => {
  it('relève un composant de bloc et un composant au fil du texte', () => {
    const used = new Set<string>()

    walkOf(used)({
      type: 'root',
      children: [
        { type: 'mdxJsxFlowElement', name: 'Callout' },
        { type: 'mdxJsxTextElement', name: 'Badge' },
      ],
    })

    expect([...used]).toEqual(['Callout', 'Badge'])
  })

  it('relève un composant caché dans un arbre ESTree', () => {
    const used = new Set<string>()

    walkOf(used)({
      type: 'mdxFlowExpression',
      data: { estree: { body: [{ type: 'JSXIdentifier', name: 'Danger' }] } },
    })

    expect([...used]).toEqual(['Danger'])
  })

  it('ignore les balises HTML, qui ne sont pas des composants', () => {
    const used = new Set<string>()

    walkOf(used)({ type: 'mdxJsxFlowElement', name: 'div', children: [] })

    expect([...used]).toEqual([])
  })

  it('ignore un fragment, qui n’a pas de nom', () => {
    const used = new Set<string>()

    walkOf(used)({ type: 'mdxJsxFlowElement', name: null, children: [] })

    expect([...used]).toEqual([])
  })

  it('traverse les tableaux imbriqués', () => {
    const used = new Set<string>()

    walkOf(used)({ children: [[{ type: 'mdxJsxFlowElement', name: 'Callout' }]] })

    expect([...used]).toEqual(['Callout'])
  })

  it('ne boucle pas sur un arbre cyclique', () => {
    const used = new Set<string>()
    const node: Record<string, unknown> = { type: 'mdxJsxFlowElement', name: 'Callout' }
    node['self'] = node

    expect(() => walkOf(used)(node)).not.toThrow()
    expect([...used]).toEqual(['Callout'])
  })

  it('ne descend pas dans les positions, qui ne portent que des numéros de ligne', () => {
    const used = new Set<string>()

    // Nœud fabriqué exprès : si le parcours traversait `position`, il y
    // trouverait un composant. Il ne doit pas.
    walkOf(used)({ position: { type: 'JSXIdentifier', name: 'Piege' } })

    expect([...used]).toEqual([])
  })
})

describe('confrontation à la liste blanche', () => {
  it('ne refuse rien quand tout est autorisé', () => {
    expect(describeIfForbidden(['Callout'], ['Callout'])).toBeNull()
  })

  it('cite le composant refusé et la liste blanche effective', () => {
    expect(describeIfForbidden(['Callout', 'Danger'], ['Callout'])).toBe(
      'utilise « Danger », hors de la liste blanche des composants MDX (Callout)',
    )
  })

  it('dit explicitement qu’aucun composant n’est autorisé', () => {
    expect(describeIfForbidden(['Callout'], [])).toContain('aucun composant autorisé')
  })
})

describe('message d’un corps illisible', () => {
  it('reprend le message de la cause', () => {
    expect(describeUnreadableBody(new Error('balise jamais refermée'))).toBe(
      'corps MDX illisible — balise jamais refermée',
    )
  })

  it('reste lisible pour ce qui n’est pas une erreur', () => {
    expect(describeUnreadableBody('panne')).toContain('panne')
  })
})

describe('accord entre la liste blanche et le rendu', () => {
  // `satisfies` (dans `components.tsx`) garantit déjà à la compilation que les
  // deux tables portent les mêmes clés : le réassérter à l'exécution ne pourrait
  // jamais rougir seul. Ce qu'il ne garantit pas, c'est qu'un nom déclaré
  // corresponde à un composant qui **rend** réellement — c'est ce qui est
  // vérifié ici, un nom à la fois.
  it.each(MDX_COMPONENT_NAMES)('« %s » est rendu par le composant déclaré', async (name) => {
    const { renderMdx } = await import('@/ui/mdx/render')

    await expect(
      renderMdx({ source: `<${name}>Contenu.</${name}>\n`, file: 'fixture.mdx' }),
    ).resolves.toBeTruthy()
  })
})
