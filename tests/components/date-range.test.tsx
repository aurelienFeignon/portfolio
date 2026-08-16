/**
 * Affichage d'une période (P3-02 ; précision variable depuis le chantier des
 * dates, ouvert par P4-04).
 *
 * Ce composant existe pour que ces décisions — le cas « en cours », et
 * maintenant la mise en forme par précision — soient testées plutôt que noyées
 * dans un fichier de route, qui ne l'est qu'en E2E.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DateRange } from '@/ui/date-range'

describe('période', () => {
  it('affiche les deux bornes d’une période terminée', () => {
    render(<DateRange locale="fr" startedAt="2024" endedAt="2025" />)

    expect(screen.getByText('2024')).toBeVisible()
    expect(screen.getByText('2025')).toBeVisible()
  })

  it('remplace la date de fin par « En cours » quand la période l’est', () => {
    render(<DateRange locale="fr" startedAt="2025" />)

    expect(screen.getByText(/En cours/)).toBeVisible()
    expect(screen.queryByText('9999')).not.toBeInTheDocument()
  })

  it('traduit « en cours »', () => {
    render(<DateRange locale="en" startedAt="2025" />)
    expect(screen.getByText(/Present/)).toBeVisible()
  })

  it('n’a pas de témoin concurrent : l’absence de date de fin décide seule', () => {
    // `isOngoing` était passé **en plus** de `endedAt`, et la condition testait
    // deux fois le même fait — un opérande mort, sans que rien ne dise lequel
    // faisait autorité. Le drapeau reste la dérivation du Content Layer (P2-06)
    // pour qui a besoin d'un booléen ; une vue qui a la date n'en a pas besoin.
    render(<DateRange locale="fr" startedAt="2025" />)

    expect(screen.getByText(/En cours/)).toBeVisible()
  })
})

describe('précision', () => {
  it.each([
    ['une année', '2021', '2021'],
    ['un mois', '2021-03', 'mars 2021'],
    ['un jour', '2021-03-14', '14 mars 2021'],
  ])('met en forme %s sans en inventer davantage', (_label, isoDate, expected) => {
    render(<DateRange locale="fr" startedAt={isoDate} />)

    expect(screen.getByText(expected)).toBeVisible()
  })

  it.each([
    ['une année', '2021', '2021'],
    ['un mois', '2021-03', 'March 2021'],
    ['un jour', '2021-03-14', 'March 14, 2021'],
  ])('met en forme %s selon la locale', (_label, isoDate, expected) => {
    render(<DateRange locale="en" startedAt={isoDate} />)

    expect(screen.getByText(expected)).toBeVisible()
  })

  it.each(['2021', '2021-03', '2021-03-14'])(
    'émet « %s » verbatim pour la machine, quelle que soit la mise en forme',
    (isoDate) => {
      // ⚠️ Le cœur du chantier. `datetime` n'est pas du rendu : c'est ce qu'un
      // moteur de recherche et le JSON-LD de P4-09 liront. La valeur stockée
      // porte déjà la précision réellement connue — la réémettre **telle quelle**
      // est la seule façon de n'affirmer ni plus ni moins que ce que l'auteur
      // sait. Le domaine du schéma est exactement celui de `<time datetime>`,
      // ce qui rend cette propriété vraie par construction.
      const { container } = render(<DateRange locale="fr" startedAt={isoDate} />)

      expect(container.querySelector('time')).toHaveAttribute('datetime', isoDate)
    },
  )

  it('ne décale pas une date d’un jour selon le fuseau de la machine', () => {
    // Une date ISO nue est interprétée à minuit **UTC**. Mise en forme dans un
    // fuseau à l'ouest, elle reculerait d'un jour — le 1ᵉʳ mars deviendrait le
    // 28 février, sans erreur et seulement sur certaines machines.
    render(<DateRange locale="fr" startedAt="2021-03-01" />)

    expect(screen.getByText('1 mars 2021')).toBeVisible()
  })
})
