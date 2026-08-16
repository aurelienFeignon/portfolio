/**
 * Liste des expériences (P4-04) — `testing-strategy.md` §4.5.
 *
 * Aucune entité de `content/` n'est nommée : les données viennent d'une
 * fabrique. Ce que ces tests gardent est la **forme** — un plan de document
 * juste, la période, et le cas « en cours » qui doit rester visible depuis la
 * liste sans qu'on ouvre la fiche.
 */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeExperienceSummary } from '../fixtures/builders/experience-summaries'
import { ExperienceList } from '@/ui/experience-list'

describe('liste des expériences', () => {
  it('titre chaque expérience par son poste, et lie vers sa fiche', () => {
    render(
      <ExperienceList
        locale="fr"
        items={[
          makeExperienceSummary({ role: 'Développeur Full-Stack', href: '/fr/experiences/une' }),
          makeExperienceSummary({ role: 'Fondateur', href: '/fr/experiences/deux' }),
        ]}
      />,
    )

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Développeur Full-Stack',
      'Fondateur',
    ])
    expect(within(headings[0] as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      '/fr/experiences/une',
    )
  })

  it('situe chaque poste : l’employeur, et le lieu quand il est connu', () => {
    render(
      <ExperienceList
        locale="fr"
        items={[makeExperienceSummary({ company: 'EVEA Conseil', location: 'Tours' })]}
      />,
    )

    expect(screen.getByText(/EVEA Conseil/)).toBeVisible()
    expect(screen.getByText(/Tours/)).toBeVisible()
  })

  it('n’invente pas de lieu quand le contenu n’en porte pas', () => {
    // `location` est facultatif au schéma. Un séparateur orphelin — « Augure · »
    // — serait le symptôme visible d'un champ absent traité comme présent.
    render(<ExperienceList locale="fr" items={[makeExperienceSummary({ company: 'Augure' })]} />)

    expect(screen.getByText('Augure')).toBeVisible()
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })

  it('montre la période à l’année, et « en cours » sans ouvrir la fiche', () => {
    render(
      <ExperienceList
        locale="fr"
        items={[
          // La fabrique rend un `href` unique à chaque appel : deux clés React
          // égales omettraient ou dupliqueraient un enfant, sans erreur.
          makeExperienceSummary({ startedAt: '2025-01-01', endedAt: undefined }),
          makeExperienceSummary({ startedAt: '2021-01-01', endedAt: '2024-06-30' }),
        ]}
      />,
    )

    expect(screen.getByText('2025')).toHaveAttribute('datetime', '2025')
    expect(screen.getByText(/En cours/)).toBeVisible()
    expect(screen.getByText('2024')).toHaveAttribute('datetime', '2024')
  })

  it('reste une page valide quand la locale ne traduit aucune expérience', () => {
    // R-07 : une section non traduite est un cas prévu, pas une erreur.
    render(<ExperienceList locale="fr" items={[]} />)

    expect(screen.getByText('Rien à afficher dans cette langue pour le moment.')).toBeVisible()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
