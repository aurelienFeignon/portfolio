/**
 * Pile technique (P4-05) — `testing-strategy.md` §4.5.
 *
 * Ce composant a été **extrait d'une route**, où il n'était couvert par aucun
 * test unitaire : le sortir l'a fait entrer dans le périmètre de couverture, et
 * la revue l'a relevé. Ce qu'il porte n'est pas une boucle mais deux règles
 * d'accessibilité qui ne se voient pas quand elles manquent.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TechnologyList } from '@/ui/technology-list'

describe('pile technique', () => {
  it('est une liste nommée par le titre qu’on lui désigne', () => {
    render(
      <>
        <h2 id="stack">Technologies</h2>
        <TechnologyList labels={['TypeScript', 'PostgreSQL']} labelledBy="stack" />
      </>,
    )

    // Sans `aria-labelledby`, un lecteur d'écran annonce une liste anonyme — et
    // aucun test ne peut la désigner autrement que par sa position.
    // `getByRole` lève déjà si la liste n'est pas nommée : le vrai garde est
    // l'attribut, que `list-style: none` rend nécessaire sous VoiceOver.
    expect(screen.getByRole('list', { name: 'Technologies' })).toHaveAttribute('role', 'list')
  })

  it('rend un élément par technologie, dans l’ordre reçu', () => {
    render(<TechnologyList labels={['TypeScript', 'PostgreSQL']} labelledBy="stack" />)

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'TypeScript',
      'PostgreSQL',
    ])
  })
})
