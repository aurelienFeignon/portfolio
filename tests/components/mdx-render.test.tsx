/**
 * P2-08 — compilation d'un corps MDX et liste blanche de composants.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MdxRenderError, messageOf, renderMdx, type MdxWhitelist } from '@/ui/mdx/render'

const FILE = 'content/fr/projects/augure.mdx'

const compile = (source: string, components?: MdxWhitelist) =>
  renderMdx({ source, file: FILE, ...(components === undefined ? {} : { components }) })

describe('rendu du corps MDX', () => {
  it('rend le Markdown en éléments sémantiques', async () => {
    render(await compile('## Un sous-titre\n\nUn paragraphe avec du **gras**.\n'))

    expect(screen.getByRole('heading', { level: 2, name: 'Un sous-titre' })).toBeInTheDocument()
    expect(screen.getByText('gras').tagName).toBe('STRONG')
  })

  it('rend les listes et les liens', async () => {
    render(await compile('- [Un lien](https://example.com)\n'))

    expect(screen.getByRole('link', { name: 'Un lien' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
    expect(screen.getByRole('listitem')).toBeInTheDocument()
  })

  it('appelle un composant de la liste blanche', async () => {
    render(await compile('<Callout tone="warning">Attention.</Callout>\n'))

    const callout = screen.getByRole('complementary')
    expect(callout).toHaveTextContent('Attention.')
    expect(callout).toHaveAttribute('data-tone', 'warning')
  })

  it('donne un ton par défaut à un encadré qui n’en précise pas', async () => {
    render(await compile('<Callout>Une remarque.</Callout>\n'))

    expect(screen.getByRole('complementary')).toHaveAttribute('data-tone', 'info')
  })
})

describe('refus', () => {
  it('rejette un composant hors de la liste blanche, en nommant le fichier', async () => {
    await expect(compile('<Danger>Hors liste.</Danger>\n')).rejects.toThrow(MdxRenderError)
    await expect(compile('<Danger>Hors liste.</Danger>\n')).rejects.toThrow(FILE)
  })

  it('nomme le composant refusé et la liste blanche effective', async () => {
    await expect(compile('<Danger>Hors liste.</Danger>\n')).rejects.toThrow(
      /« Danger ».*liste blanche.*Callout/s,
    )
  })

  it('rejette un composant utilisé au fil du texte, pas seulement en bloc', async () => {
    await expect(compile('Un paragraphe avec <Danger /> dedans.\n')).rejects.toThrow(/« Danger »/)
  })

  it('rejette un composant imbriqué dans un composant autorisé', async () => {
    await expect(compile('<Callout>\n  <Danger>Imbriqué.</Danger>\n</Callout>\n')).rejects.toThrow(
      /« Danger »/,
    )
  })

  it('rejette avant tout rendu : la liste blanche vide n’autorise rien', async () => {
    await expect(compile('<Callout>Rien n’est autorisé.</Callout>\n', {})).rejects.toThrow(
      /aucun composant autorisé/,
    )
  })

  it('laisse passer les balises HTML, qui ne sont pas des composants', async () => {
    render(await compile('Un <em>mot</em> en italique.\n'))

    expect(screen.getByText('mot').tagName).toBe('EM')
  })

  it('rejette un corps MDX syntaxiquement invalide, en nommant le fichier', async () => {
    await expect(compile('<div>jamais refermée\n')).rejects.toThrow(MdxRenderError)
    await expect(compile('<div>jamais refermée\n')).rejects.toThrow(/corps MDX illisible/)
  })
})

describe('message d’une cause quelconque', () => {
  it('prend le message d’une erreur', () => {
    expect(messageOf(new Error('quelque chose'))).toBe('quelque chose')
  })

  it('reste lisible pour ce qui n’est pas une erreur', () => {
    expect(messageOf('panne')).toBe('panne')
  })
})
