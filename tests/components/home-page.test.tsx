import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HomePage from '@/app/page'

// Testé par le rôle et le texte accessible, jamais par la classe CSS ou la
// structure du DOM : ce qui est vérifié ici est ce que perçoit l'utilisateur —
// et notamment celui qui navigue au lecteur d'écran (testing-strategy.md §3).
describe('page d’accueil', () => {
  it('expose exactement un titre de niveau 1', () => {
    render(<HomePage />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('nomme le titre principal', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeInTheDocument()
  })

  it('rend un point de repère principal, cible du lien d’évitement', () => {
    render(<HomePage />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })
})
