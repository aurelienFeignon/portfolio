/**
 * Compétences groupées par catégorie (P4-06) — `testing-strategy.md` §4.5.
 *
 * Aucune compétence de `content/` n'est nommée : les données sont fabriquées.
 * Ce que ces tests gardent est la **forme** — un titre par catégorie remplie,
 * l'ordre reçu, et l'état vide qui reste une page valide.
 */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SkillList } from '@/ui/skill-list'

describe('liste des compétences', () => {
  it('rattache chaque compétence à son groupe', () => {
    render(
      <SkillList
        locale="fr"
        groups={[
          { category: 'language', skills: [{ slug: 'un-langage', name: 'Un langage' }] },
          {
            category: 'tooling',
            skills: [
              { slug: 'un-outil', name: 'Un outil' },
              { slug: 'un-autre-outil', name: 'Un autre outil' },
            ],
          },
        ]}
      />,
    )

    // Le rattachement se vérifie par le **nom accessible** de la liste, que lui
    // donne son titre : sans lui, la seule prise serait la position.
    const tooling = screen.getByRole('list', { name: 'Outillage' })
    expect(
      within(tooling)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Un outil', 'Un autre outil'])
  })

  it('conserve l’ordre reçu, pour les groupes comme pour leur contenu', () => {
    // L'ordre est décidé par la couche Content (`groupByCategory`, `bySkillOrder`).
    // Une vue qui réordonne est un défaut, pas une commodité.
    //
    // Ce test couvre aussi « n'invente aucune catégorie » : deux groupes reçus,
    // deux titres — les trois autres catégories du domaine n'apparaissent pas.
    render(
      <SkillList
        locale="fr"
        groups={[
          {
            category: 'practice',
            skills: [
              { slug: 'zeta', name: 'Zêta' },
              { slug: 'alpha', name: 'Alpha' },
            ],
          },
          { category: 'language', skills: [{ slug: 'un-langage', name: 'Un langage' }] },
        ]}
      />,
    )

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Pratiques',
      'Langages',
    ])
    expect(
      within(screen.getByRole('list', { name: 'Pratiques' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Zêta', 'Alpha'])
  })

  it('traduit les titres de catégorie', () => {
    render(
      <SkillList
        locale="en"
        groups={[{ category: 'tooling', skills: [{ slug: 'a-tool', name: 'A tool' }] }]}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Tooling' })).toBeVisible()
  })

  it('reste une page valide quand la locale ne traduit aucune compétence', () => {
    // R-07 : une section non traduite est un cas prévu, pas une erreur.
    render(<SkillList locale="fr" groups={[]} />)

    expect(screen.getByText('Rien à afficher dans cette langue pour le moment.')).toBeVisible()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
