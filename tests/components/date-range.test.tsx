/**
 * Affichage d'une période, et cas « en cours » (P3-02).
 *
 * Ce composant existe pour que cette décision — deux branches — soit testée
 * plutôt que noyée dans un fichier de route, qui ne l'est qu'en E2E.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DateRange } from '@/ui/date-range'

describe('période', () => {
  it('affiche les deux bornes d’une période terminée', () => {
    render(<DateRange locale="fr" startedAt="2024-01-15" endedAt="2025-06-30" isOngoing={false} />)

    expect(screen.getByText('2024-01-15')).toHaveAttribute('datetime', '2024-01-15')
    expect(screen.getByText('2025-06-30')).toHaveAttribute('datetime', '2025-06-30')
  })

  it('remplace la date de fin par « En cours » quand la période l’est', () => {
    render(<DateRange locale="fr" startedAt="2025-01-01" isOngoing={true} />)

    expect(screen.getByText(/En cours/)).toBeVisible()
    expect(screen.queryByText('9999-12-31')).not.toBeInTheDocument()
  })

  it('traduit « en cours »', () => {
    render(<DateRange locale="en" startedAt="2025-01-01" isOngoing={true} />)
    expect(screen.getByText(/Present/)).toBeVisible()
  })

  it('ne rend pas une balise `time` vide quand la date de fin manque sans dérivation', () => {
    // Cas défensif : `isOngoing` est dérivé de l'absence d'`endedAt` (P2-06), les
    // deux devraient toujours s'accorder. S'ils divergeaient, mieux vaut afficher
    // « en cours » qu'un `<time datetime="">`.
    render(<DateRange locale="fr" startedAt="2025-01-01" isOngoing={false} />)

    expect(screen.getByText(/En cours/)).toBeVisible()
  })

  it('conserve la date lisible par une machine', () => {
    render(<DateRange locale="fr" startedAt="2024-01-15" endedAt="2025-06-30" isOngoing={false} />)

    for (const element of screen.getAllByText(/\d{4}-\d{2}-\d{2}/)) {
      expect(element).toHaveAttribute('datetime', element.textContent)
    }
  })
})
