/**
 * Liste d'entités et **état vide** (P3-02) — `testing-strategy.md` §4.5.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EntityList, type EntityLink } from '@/ui/entity-list'

const ITEMS: EntityLink[] = [
  { href: '/fr/projects/augure', label: 'Augure', note: 'Plateforme prédictive' },
  { href: '/fr/projects/portfolio', label: 'Portfolio' },
]

describe('liste d’entités', () => {
  it('rend un lien par entité, vers sa page', () => {
    render(<EntityList locale="fr" items={ITEMS} />)

    expect(screen.getByRole('link', { name: 'Augure' })).toHaveAttribute(
      'href',
      '/fr/projects/augure',
    )
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute(
      'href',
      '/fr/projects/portfolio',
    )
  })

  it('rend une liste, pas une suite de liens', () => {
    // Un lecteur d'écran annonce « liste de 2 éléments » : l'information de
    // dénombrement disparaîtrait avec une suite de balises `<a>`.
    render(<EntityList locale="fr" items={ITEMS} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('affiche le complément quand il existe', () => {
    render(<EntityList locale="fr" items={ITEMS} />)
    expect(screen.getByText(/Plateforme prédictive/)).toBeInTheDocument()
  })

  it('n’invente rien quand le complément est absent', () => {
    render(<EntityList locale="fr" items={[{ href: '/fr/x', label: 'X' }]} />)
    expect(screen.getByRole('listitem')).toHaveTextContent(/^X$/)
  })

  describe('état vide', () => {
    it('affiche un message plutôt qu’une liste sans éléments', () => {
      render(<EntityList locale="fr" items={[]} />)

      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expect(screen.getByText('Rien à afficher dans cette langue pour le moment.')).toBeVisible()
    })

    it('le dit dans la langue de la page', () => {
      render(<EntityList locale="en" items={[]} />)
      expect(screen.getByText('Nothing to show in this language yet.')).toBeVisible()
    })
  })
})
