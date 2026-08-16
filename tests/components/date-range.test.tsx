/**
 * Affichage d'une période, et cas « en cours » (P3-02, précision d'affichage
 * tranchée en P4-04).
 *
 * Ce composant existe pour que cette décision — deux branches — soit testée
 * plutôt que noyée dans un fichier de route, qui ne l'est qu'en E2E.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DateRange } from '@/ui/date-range'

describe('période', () => {
  it('affiche les deux bornes d’une période terminée, à l’année', () => {
    render(<DateRange locale="fr" startedAt="2024-01-15" endedAt="2025-06-30" />)

    expect(screen.getByText('2024')).toBeVisible()
    expect(screen.getByText('2025')).toBeVisible()
  })

  it('remplace la date de fin par « En cours » quand la période l’est', () => {
    render(<DateRange locale="fr" startedAt="2025-01-01" />)

    expect(screen.getByText(/En cours/)).toBeVisible()
    expect(screen.queryByText('9999')).not.toBeInTheDocument()
  })

  it('traduit « en cours »', () => {
    render(<DateRange locale="en" startedAt="2025-01-01" />)
    expect(screen.getByText(/Present/)).toBeVisible()
  })

  it('n’a plus de témoin concurrent : l’absence de date de fin décide seule', () => {
    // `isOngoing` était passé **en plus** de `endedAt`, et la condition testait
    // deux fois le même fait — un opérande mort, sans que rien ne dise lequel
    // faisait autorité. Le drapeau reste la dérivation du Content Layer (P2-06)
    // pour qui a besoin d'un booléen ; une vue qui a la date n'en a pas besoin.
    render(<DateRange locale="fr" startedAt="2025-01-01" />)

    expect(screen.getByText(/En cours/)).toBeVisible()
    expect(screen.queryByText('9999')).not.toBeInTheDocument()
  })

  it('n’affirme pas à la machine plus de précision qu’il n’en montre', () => {
    // ⚠️ Le cœur de la décision de P4-04. Le contenu porte `2024-01-15`, mais ce
    // jour-là n'est **pas connu** pour les expériences réelles : le CV ne donne
    // que des années, et le 1ᵉʳ janvier écrit dans `content/` est une valeur
    // d'attente que le schéma impose (décision D1, ouverte).
    //
    // Un `datetime="2024-01-15"` affirmerait ce jour à un moteur de recherche et
    // aux données structurées de P4-09, alors que la page n'affiche que l'année.
    // La règle retenue est générale et ne dépend pas de D1 : **la valeur lisible
    // par une machine porte la précision de ce qui est montré**.
    render(<DateRange locale="fr" startedAt="2024-01-15" endedAt="2025-06-30" />)

    expect(screen.getByText('2024')).toHaveAttribute('datetime', '2024')
    expect(screen.getByText('2025')).toHaveAttribute('datetime', '2025')
  })
})
