/**
 * Accès aux sections depuis l'accueil (P4-03) — `testing-strategy.md` §4.5.
 *
 * Ce composant double la navigation de l'en-tête, et c'est voulu : un visiteur
 * qui arrive sur l'accueil doit pouvoir choisir sans lire une barre. Ce que les
 * tests gardent est ce qui distingue les deux — ici, chaque section est un
 * **titre de niveau 2** accompagné de sa description, là-bas trois liens nus.
 */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeSectionLinks } from '../fixtures/builders/navigation'
import { SectionGuide } from '@/ui/section-guide'

const LINKS = makeSectionLinks()

describe('accès aux sections', () => {
  it('rend une entrée par section, titrée et cliquable', () => {
    render(<SectionGuide locale="fr" links={LINKS} />)

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Expériences',
      'Projets',
      'Compétences',
    ])

    expect(
      headings.map((heading) => within(heading).getByRole('link').getAttribute('href')),
    ).toEqual(LINKS.map(({ href }) => href))
  })

  it('dit ce que chaque section contient, plutôt que de la nommer seulement', () => {
    // C'est la seule chose que la navigation de l'en-tête ne fait pas, et donc
    // la raison d'être de ce composant.
    render(<SectionGuide locale="fr" links={LINKS} />)

    expect(
      screen.getByText('Parcours professionnel : postes, missions et réalisations.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Projets personnels, professionnels et open source.'),
    ).toBeInTheDocument()
  })

  it('traduit ses libellés, mais pas les cibles qu’on lui donne', () => {
    render(<SectionGuide locale="en" links={makeSectionLinks('en')} />)

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/en/projects')
  })

  it('n’affiche que les sections qu’on lui donne', () => {
    render(<SectionGuide locale="fr" links={[{ section: 'skills', href: '/fr/skills' }]} />)

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
  })
})
